import { z } from "zod";
import type { Json } from "@ci/db";
import {
  runConfigSchema,
  STORAGE_BUCKET_CREATIVES,
  tokenCostUsd,
  WHISPER_USD_PER_MINUTE,
} from "@ci/shared";
import {
  createAnthropicAdapter,
  createWhisperAdapter,
  type BatchRequestInput,
} from "@ci/shared/adapters";
import {
  buildCreativeAnalysisTextPrompt,
  CREATIVE_ANALYSIS_MODEL,
  CREATIVE_ANALYSIS_PROMPT_VERSION,
  creativeAnalysisSchema,
  creativeAnalysisSystemPrompt,
} from "@ci/shared/prompts";
import type Anthropic from "@anthropic-ai/sdk";
import { log } from "../log";
import {
  extractMediaFromUrl,
  imageUrlToWebp,
  resolveMediaTools,
} from "../media";
import {
  appendRunError,
  fetchAllCreatives,
  getRun,
  mergeCostBreakdown,
  mergePhaseCounts,
  updateRun,
} from "../run-utils";
import type { ServiceClient } from "../supabase";
import type { HandlerContext, JobHandler } from "./types";

const payloadSchema = z.object({ run_id: z.uuid() });

interface AnalyzeCreativeRow {
  id: string;
  source: "meta_ad" | "tiktok" | "instagram";
  caption: string | null;
  published_at: string | null;
  raw_metrics: Record<string, unknown>;
  score_breakdown: Record<string, unknown> | null;
  account_id: string | null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function uploadFrames(
  supabase: ServiceClient,
  basePath: string,
  frames: Buffer[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const [index, data] of frames.entries()) {
    const framePath = `${basePath}/frame-${index}.webp`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET_CREATIVES)
      .upload(framePath, data, { contentType: "image/webp", upsert: true });
    if (error) throw new Error(`Frame-Upload fehlgeschlagen: ${error.message}`);
    paths.push(framePath);
  }
  return paths;
}

/**
 * ANALYZE-Phase: Für den Top-N-Pool werden Frames (fest + Szenenwechsel,
 * max. 8, 512 px, WebP) und das Whisper-Transkript erzeugt, dann liefert
 * Sonnet pro Creative die strukturierte Analyse (Batch API). Videos
 * werden nur temporär gestreamt – gespeichert werden ausschließlich
 * WebP-Frames.
 */
export const analyze: JobHandler = async (ctx: HandlerContext) => {
  const { supabase, env, job } = ctx;
  const { run_id } = payloadSchema.parse(job.payload);

  const run = await getRun(supabase, run_id);
  if (run.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }
  if (run.status !== "scoring" && run.status !== "analyzing") {
    return { skipped: true, reason: `Status ist ${run.status}` };
  }
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt");
  }

  await updateRun(supabase, run_id, { status: "analyzing" });

  const config = runConfigSchema.parse(run.config ?? {});
  const tools = resolveMediaTools(env);

  const relevant = await fetchAllCreatives<AnalyzeCreativeRow>(
    supabase,
    run_id,
    "id, source, caption, published_at, raw_metrics, score_breakdown, account_id",
    { minRelevance: config.relevanceThreshold },
  );
  const pool = relevant.filter(
    (c) => c.score_breakdown?.selected_for_analysis === true,
  );

  // Account-Handles für den Prompt-Kontext.
  const accountIds = [
    ...new Set(pool.map((c) => c.account_id).filter(Boolean) as string[]),
  ];
  const handles = new Map<string, string | null>();
  for (let i = 0; i < accountIds.length; i += 200) {
    const { data } = await supabase
      .from("accounts")
      .select("id, handle")
      .in("id", accountIds.slice(i, i + 200));
    for (const row of data ?? []) handles.set(row.id, row.handle);
  }

  // Bestehende Analysen (Retry-Fall): Medien nicht doppelt erzeugen.
  const existing = new Map<
    string,
    { transcript: string | null; frame_paths: string[]; done: boolean }
  >();
  const poolIds = pool.map((c) => c.id);
  for (let i = 0; i < poolIds.length; i += 200) {
    const { data } = await supabase
      .from("creative_analyses")
      .select("creative_id, transcript, frame_paths, analysis")
      .in("creative_id", poolIds.slice(i, i + 200));
    for (const row of data ?? []) {
      const analysis = row.analysis as { why_it_works?: string } | null;
      existing.set(row.creative_id, {
        transcript: row.transcript,
        frame_paths: row.frame_paths ?? [],
        done: Boolean(analysis?.why_it_works),
      });
    }
  }

  const whisper = env.OPENAI_API_KEY
    ? createWhisperAdapter({ apiKey: env.OPENAI_API_KEY })
    : null;

  let whisperSeconds = 0;
  let ffmpegBroken = false;
  const mediaErrors: string[] = [];
  /** Frames pro Creative als Buffer für den Batch (base64). */
  const frameBuffers = new Map<string, Buffer[]>();
  const transcripts = new Map<string, string | null>();
  const framePaths = new Map<string, string[]>();
  const durations = new Map<string, number | null>();

  let processed = 0;
  for (const creative of pool) {
    processed++;
    if (processed % 10 === 0) {
      const fresh = await getRun(supabase, run_id);
      if (fresh.status === "cancelled") {
        return { skipped: true, reason: "Run wurde abgebrochen" };
      }
    }

    const prior = existing.get(creative.id);
    if (prior?.done) continue;

    // Retry: Medien liegen bereits in Storage → Frames herunterladen.
    if (prior && prior.frame_paths.length > 0) {
      transcripts.set(creative.id, prior.transcript);
      framePaths.set(creative.id, prior.frame_paths);
      const buffers: Buffer[] = [];
      for (const framePath of prior.frame_paths) {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKET_CREATIVES)
          .download(framePath);
        if (data) buffers.push(Buffer.from(await data.arrayBuffer()));
      }
      frameBuffers.set(creative.id, buffers);
      continue;
    }

    const basePath = `${run.organization_id}/${run_id}/${creative.id}`;
    const videoUrl =
      creative.source !== "meta_ad" ? str(creative.raw_metrics.video_url) : null;
    const thumbnailUrl = str(creative.raw_metrics.thumbnail_url);

    let buffers: Buffer[] = [];
    let transcript: string | null = null;
    let duration: number | null = null;

    if (videoUrl && !ffmpegBroken) {
      try {
        const media = await extractMediaFromUrl(videoUrl, tools);
        buffers = media.frames.map((f) => f.data);
        duration = media.durationSeconds || null;
        if (media.audioWav && whisper) {
          try {
            const result = await whisper.transcribe({
              audio: media.audioWav,
              filename: `${creative.id}.wav`,
            });
            transcript = result.text || null;
            whisperSeconds +=
              result.durationSeconds ?? media.durationSeconds ?? 0;
          } catch (error) {
            mediaErrors.push(
              `Whisper (${creative.id}): ${error instanceof Error ? error.message : error}`,
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("ENOENT")) {
          ffmpegBroken = true;
          mediaErrors.push(
            "ffmpeg/ffprobe nicht gefunden – Analyse läuft ohne Frames/Transkripte",
          );
        } else {
          mediaErrors.push(`Video (${creative.id}): ${message.slice(0, 200)}`);
        }
      }
    }

    // Fallback: wenigstens das Thumbnail als ein Frame.
    if (buffers.length === 0 && thumbnailUrl && !ffmpegBroken) {
      try {
        buffers = [await imageUrlToWebp(thumbnailUrl, tools)];
      } catch {
        // Text-only-Analyse bleibt möglich.
      }
    }

    let paths: string[] = [];
    if (buffers.length > 0) {
      try {
        paths = await uploadFrames(supabase, basePath, buffers);
      } catch (error) {
        mediaErrors.push(
          `Upload (${creative.id}): ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    frameBuffers.set(creative.id, buffers);
    transcripts.set(creative.id, transcript);
    framePaths.set(creative.id, paths);
    durations.set(creative.id, duration);

    const { error: upsertError } = await supabase
      .from("creative_analyses")
      .upsert(
        {
          organization_id: run.organization_id,
          creative_id: creative.id,
          transcript,
          frame_paths: paths,
          analysis: {} as Json,
          model: CREATIVE_ANALYSIS_MODEL,
        },
        { onConflict: "creative_id" },
      );
    if (upsertError) {
      mediaErrors.push(`DB (${creative.id}): ${upsertError.message}`);
    }
  }

  if (mediaErrors.length > 0) {
    await appendRunError(supabase, run_id, {
      phase: "analyze",
      message: `${mediaErrors.length} Medien-Probleme (Analyse läuft mit Fallbacks weiter)`,
      detail: mediaErrors.slice(0, 5).join(" | "),
    });
  }

  // ---------- Sonnet-Batch über den gesamten Pool ----------
  const todo = pool.filter((c) => !existing.get(c.id)?.done);
  const requests: BatchRequestInput[] = todo.map((creative) => {
    const buffers = frameBuffers.get(creative.id) ?? [];
    const imageBlocks: Anthropic.ContentBlockParam[] = buffers.map((data) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/webp",
        data: data.toString("base64"),
      },
    }));
    const metricsDuration = creative.raw_metrics.duration_seconds;
    const text = buildCreativeAnalysisTextPrompt({
      source: creative.source,
      caption: creative.caption,
      transcript: transcripts.get(creative.id) ?? null,
      headline: str(creative.raw_metrics.headline),
      linkDescription: str(creative.raw_metrics.link_description),
      accountHandle: creative.account_id
        ? (handles.get(creative.account_id) ?? null)
        : null,
      durationSeconds:
        durations.get(creative.id) ??
        (typeof metricsDuration === "number" ? metricsDuration : null),
      frameCount: buffers.length,
    });
    return {
      customId: creative.id,
      system: creativeAnalysisSystemPrompt,
      content: [...imageBlocks, { type: "text", text }],
    };
  });

  let analyzedNow = 0;
  let failures = 0;
  if (requests.length > 0) {
    const adapter = createAnthropicAdapter(env.ANTHROPIC_API_KEY);
    const { results, totals } = await adapter.structuredBatch({
      model: CREATIVE_ANALYSIS_MODEL,
      requests,
      schema: creativeAnalysisSchema,
      maxTokens: 2048,
    });

    for (const [creativeId, result] of results) {
      if (!result.ok) {
        failures++;
        continue;
      }
      const { error } = await supabase
        .from("creative_analyses")
        .update({
          analysis: result.data as unknown as Json,
          model: CREATIVE_ANALYSIS_MODEL,
          input_tokens: result.usage.inputTokens,
          output_tokens: result.usage.outputTokens,
        })
        .eq("creative_id", creativeId);
      if (!error) analyzedNow++;
    }

    await mergeCostBreakdown(supabase, run_id, "anthropic", {
      sonnet: {
        inputTokens: totals.inputTokens,
        outputTokens: totals.outputTokens,
        usd: Number(
          tokenCostUsd(
            CREATIVE_ANALYSIS_MODEL,
            totals.inputTokens,
            totals.outputTokens,
            { batch: true },
          ).toFixed(4),
        ),
      },
    } as Json);
  }

  if (whisperSeconds > 0) {
    await mergeCostBreakdown(supabase, run_id, "openai", {
      whisperSeconds: Math.round(whisperSeconds),
      usd: Number(((whisperSeconds / 60) * WHISPER_USD_PER_MINUTE).toFixed(4)),
    } as Json);
  }

  if (failures > 0) {
    await appendRunError(supabase, run_id, {
      phase: "analyze",
      message: `${failures} Creatives konnten nicht analysiert werden`,
    });
  }

  const analyzedTotal =
    analyzedNow + pool.filter((c) => existing.get(c.id)?.done).length;
  await mergePhaseCounts(supabase, run_id, { analyzed: analyzedTotal });

  const fresh = await getRun(supabase, run_id);
  if (fresh.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }

  if (ctx.hasHandler("synthesize")) {
    const { error } = await supabase.from("job_queue").insert({
      organization_id: run.organization_id,
      run_id,
      job_type: "synthesize",
      payload: { run_id } as Json,
    });
    if (error) {
      throw new Error(
        `Synthesize-Job konnte nicht angelegt werden: ${error.message}`,
      );
    }
    log.info("Analyze abgeschlossen, Synthese eingereiht", {
      runId: run_id,
      analyzed: analyzedTotal,
    });
  } else {
    await updateRun(supabase, run_id, {
      status: "completed",
      finished_at: new Date().toISOString(),
    });
  }

  return {
    promptVersion: CREATIVE_ANALYSIS_PROMPT_VERSION,
    pool: pool.length,
    analyzed: analyzedTotal,
    failures,
    whisperSeconds: Math.round(whisperSeconds),
  };
};
