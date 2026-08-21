import { z } from "zod";
import type { Json } from "@ci/db";
import {
  industryProfileSchema,
  runConfigSchema,
  tokenCostUsd,
} from "@ci/shared";
import { createAnthropicAdapter, type BatchRequestInput } from "@ci/shared/adapters";
import {
  buildRelevanceSystemPrompt,
  buildRelevanceUserPrompt,
  RELEVANCE_MODEL,
  RELEVANCE_PROMPT_VERSION,
  relevanceResultSchema,
} from "@ci/shared/prompts";
import { log } from "../log";
import {
  appendRunError,
  fetchAllCreatives,
  getRun,
  mergeCostBreakdown,
  mergePhaseCounts,
  runChunked,
  updateRun,
} from "../run-utils";
import type { HandlerContext, JobHandler } from "./types";

const payloadSchema = z.object({ run_id: z.uuid() });

interface FilterCreativeRow {
  id: string;
  source: string;
  caption: string | null;
  raw_metrics: { headline?: string | null } & Record<string, unknown>;
  account_id: string | null;
}

/**
 * FILTER-Phase: semantische Relevanz 0–10 pro Item (Haiku, Batch API),
 * Zuordnung Kern-/Nachbarbranche/branchenfremd. Schwelle konfigurierbar.
 */
export const filter: JobHandler = async (ctx: HandlerContext) => {
  const { supabase, env, job } = ctx;
  const { run_id } = payloadSchema.parse(job.payload);

  const run = await getRun(supabase, run_id);
  if (run.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }
  if (run.status !== "collecting" && run.status !== "filtering") {
    return { skipped: true, reason: `Status ist ${run.status}` };
  }
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt");
  }

  await updateRun(supabase, run_id, { status: "filtering" });

  const { data: profileRow } = await supabase
    .from("industry_profiles")
    .select("profile")
    .eq("id", run.profile_id)
    .single();
  const profile = industryProfileSchema.parse(profileRow?.profile ?? {});
  const config = runConfigSchema.parse(run.config ?? {});

  const creatives = await fetchAllCreatives<FilterCreativeRow>(
    supabase,
    run_id,
    "id, source, caption, raw_metrics, account_id",
    { onlyUnfiltered: true },
  );

  // Account-Bios für den Kontext nachladen.
  const accountIds = [
    ...new Set(creatives.map((c) => c.account_id).filter(Boolean) as string[]),
  ];
  const accounts = new Map<string, { handle: string | null; bio: string | null }>();
  for (let i = 0; i < accountIds.length; i += 200) {
    const { data } = await supabase
      .from("accounts")
      .select("id, handle, bio")
      .in("id", accountIds.slice(i, i + 200));
    for (const row of data ?? []) {
      accounts.set(row.id, { handle: row.handle, bio: row.bio });
    }
  }

  // Items ohne jeglichen Text sind nicht klassifizierbar → irrelevant.
  const noText: string[] = [];
  const requests: BatchRequestInput[] = [];
  const systemPrompt = buildRelevanceSystemPrompt(profile);

  for (const creative of creatives) {
    const headline =
      typeof creative.raw_metrics?.headline === "string"
        ? creative.raw_metrics.headline
        : null;
    const account = creative.account_id
      ? accounts.get(creative.account_id)
      : undefined;
    if (!creative.caption && !headline && !account?.bio) {
      noText.push(creative.id);
      continue;
    }
    requests.push({
      customId: creative.id,
      system: systemPrompt,
      content: buildRelevanceUserPrompt({
        source: creative.source,
        caption: creative.caption,
        headline,
        accountBio: account?.bio ?? null,
        accountHandle: account?.handle ?? null,
      }),
    });
  }

  await runChunked(noText, 20, async (id) => {
    await supabase
      .from("creatives")
      .update({ relevance_score: 0, category: "foreign" })
      .eq("id", id);
  });

  let failures = 0;
  if (requests.length > 0) {
    const adapter = createAnthropicAdapter(env.ANTHROPIC_API_KEY);
    const { results, totals } = await adapter.structuredBatch({
      model: RELEVANCE_MODEL,
      requests,
      schema: relevanceResultSchema,
      maxTokens: 256,
    });

    const entries = [...results.entries()];
    await runChunked(entries, 20, async ([creativeId, result]) => {
      if (!result.ok) {
        failures++;
        return;
      }
      await supabase
        .from("creatives")
        .update({
          relevance_score: result.data.relevance,
          category: result.data.category,
        })
        .eq("id", creativeId);
    });

    await mergeCostBreakdown(supabase, run_id, "anthropic", {
      haiku: {
        inputTokens: totals.inputTokens,
        outputTokens: totals.outputTokens,
        usd: Number(
          tokenCostUsd(RELEVANCE_MODEL, totals.inputTokens, totals.outputTokens, {
            batch: true,
          }).toFixed(4),
        ),
      },
    } as Json);

    if (failures > 0) {
      await appendRunError(supabase, run_id, {
        phase: "filter",
        message: `${failures} Creatives konnten nicht klassifiziert werden`,
      });
    }
  }

  // Zwischenzeitlich abgebrochen?
  const fresh = await getRun(supabase, run_id);
  if (fresh.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }

  const { count: relevant } = await supabase
    .from("creatives")
    .select("id", { count: "exact", head: true })
    .eq("run_id", run_id)
    .gte("relevance_score", config.relevanceThreshold);

  await mergePhaseCounts(supabase, run_id, { relevant: relevant ?? 0 });

  if (ctx.hasHandler("score")) {
    const { error } = await supabase.from("job_queue").insert({
      organization_id: run.organization_id,
      run_id,
      job_type: "score",
      payload: { run_id } as Json,
    });
    if (error) {
      throw new Error(`Score-Job konnte nicht angelegt werden: ${error.message}`);
    }
    log.info("Filter abgeschlossen, Score-Phase eingereiht", {
      runId: run_id,
      relevant,
    });
  } else {
    await updateRun(supabase, run_id, {
      status: "completed",
      finished_at: new Date().toISOString(),
    });
  }

  return {
    promptVersion: RELEVANCE_PROMPT_VERSION,
    classified: requests.length,
    noText: noText.length,
    failures,
    relevant: relevant ?? 0,
  };
};
