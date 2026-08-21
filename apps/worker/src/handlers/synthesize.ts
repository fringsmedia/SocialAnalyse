import { z } from "zod";
import type { Json, TablesInsert } from "@ci/db";
import { runConfigSchema, tokenCostUsd } from "@ci/shared";
import { createAnthropicAdapter } from "@ci/shared/adapters";
import {
  buildSynthesisUserPrompt,
  creativeAnalysisSchema,
  PATTERN_SYNTHESIS_MODEL,
  PATTERN_SYNTHESIS_PROMPT_VERSION,
  patternReportSchema,
  patternSynthesisSystemPrompt,
  type SynthesisItem,
} from "@ci/shared/prompts";
import { log } from "../log";
import {
  appendRunError,
  fetchAllCreatives,
  getRun,
  mergeCostBreakdown,
  mergePhaseCounts,
  updateRun,
} from "../run-utils";
import type { HandlerContext, JobHandler } from "./types";

const payloadSchema = z.object({ run_id: z.uuid() });

/** Zuordnung Report-Sektion → patterns.type. */
const SECTION_TYPES = [
  ["hooks", "hook"],
  ["structures", "structure"],
  ["offer_framings", "offer_framing"],
  ["ctas", "cta"],
  ["visual_patterns", "visual"],
] as const;

interface PoolCreativeRow {
  id: string;
  source: string;
  category: string | null;
  performance_score: number | null;
  score_breakdown: Record<string, unknown> | null;
}

/**
 * SYNTHESIZE-Phase: Ein Opus-Batch-Call pro Run clustert Hooks,
 * Strukturen, Angebotsframings, CTAs und visuelle Muster über alle
 * analysierten Creatives, mit 2–3 belegten Beispielen pro Cluster.
 */
export const synthesize: JobHandler = async (ctx: HandlerContext) => {
  const { supabase, env, job } = ctx;
  const { run_id } = payloadSchema.parse(job.payload);

  const run = await getRun(supabase, run_id);
  if (run.status === "cancelled") {
    return { skipped: true, reason: "Run wurde abgebrochen" };
  }
  if (run.status !== "analyzing" && run.status !== "synthesizing") {
    return { skipped: true, reason: `Status ist ${run.status}` };
  }
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt");
  }

  await updateRun(supabase, run_id, { status: "synthesizing" });

  const config = runConfigSchema.parse(run.config ?? {});

  // Pool-Creatives + zugehörige Analysen laden.
  const relevant = await fetchAllCreatives<PoolCreativeRow>(
    supabase,
    run_id,
    "id, source, category, performance_score, score_breakdown",
    { minRelevance: config.relevanceThreshold },
  );
  const pool = relevant
    .filter((c) => c.score_breakdown?.selected_for_analysis === true)
    .sort((a, b) => (b.performance_score ?? 0) - (a.performance_score ?? 0));

  const analyses = new Map<string, unknown>();
  const poolIds = pool.map((c) => c.id);
  for (let i = 0; i < poolIds.length; i += 200) {
    const { data } = await supabase
      .from("creative_analyses")
      .select("creative_id, analysis")
      .in("creative_id", poolIds.slice(i, i + 200));
    for (const row of data ?? []) analyses.set(row.creative_id, row.analysis);
  }

  // Referenzen c1…cN (nach Score sortiert) für den Prompt aufbauen.
  const items: SynthesisItem[] = [];
  const refToId = new Map<string, string>();
  for (const creative of pool) {
    const parsed = creativeAnalysisSchema.safeParse(analyses.get(creative.id));
    if (!parsed.success) continue;
    const ref = `c${items.length + 1}`;
    refToId.set(ref, creative.id);
    items.push({
      ref,
      source: creative.source,
      category: creative.category ?? "core",
      score: creative.performance_score ?? 0,
      analysis: parsed.data,
    });
  }

  if (items.length < 3) {
    await appendRunError(supabase, run_id, {
      phase: "synthesize",
      message: `Zu wenige analysierte Creatives (${items.length}) für eine Synthese`,
    });
    await updateRun(supabase, run_id, {
      status: "completed",
      finished_at: new Date().toISOString(),
    });
    return { skipped: true, reason: "zu wenige Analysen", analyzed: items.length };
  }

  const adapter = createAnthropicAdapter(env.ANTHROPIC_API_KEY);
  const { results, totals } = await adapter.structuredBatch({
    model: PATTERN_SYNTHESIS_MODEL,
    requests: [
      {
        customId: "report",
        system: patternSynthesisSystemPrompt,
        content: buildSynthesisUserPrompt(items),
      },
    ],
    schema: patternReportSchema,
    maxTokens: 8192,
  });

  const reportResult = results.get("report");
  if (!reportResult || !reportResult.ok) {
    throw new Error(
      `Synthese fehlgeschlagen: ${reportResult && !reportResult.ok ? reportResult.error : "kein Ergebnis"}`,
    );
  }
  const report = reportResult.data;

  // Referenzen auflösen (halluzinierte Refs stillschweigend verwerfen).
  const resolveRefs = (refs: string[]): string[] =>
    refs
      .map((ref) => refToId.get(ref.trim()))
      .filter((id): id is string => Boolean(id))
      .slice(0, 5);

  // Idempotenz bei Retry: alte Patterns des Runs ersetzen.
  await supabase.from("patterns").delete().eq("run_id", run_id);

  const patternRows: TablesInsert<"patterns">[] = [];
  const resolvedReport: Record<string, unknown> = { summary: report.summary };

  for (const [sectionKey, patternType] of SECTION_TYPES) {
    const clusters = report[sectionKey];
    const resolvedClusters = clusters.map((cluster) => ({
      ...cluster,
      example_creative_ids: resolveRefs(cluster.example_refs),
    }));
    resolvedReport[sectionKey] = resolvedClusters;
    for (const cluster of resolvedClusters) {
      patternRows.push({
        organization_id: run.organization_id,
        run_id,
        type: patternType,
        title: cluster.title,
        description: cluster.description,
        frequency: cluster.frequency,
        example_creative_ids: cluster.example_creative_ids,
        data: {
          why_it_works: cluster.why_it_works,
          transferability: cluster.transferability,
        } as Json,
      });
    }
  }

  if (patternRows.length > 0) {
    const { error } = await supabase.from("patterns").insert(patternRows);
    if (error) {
      throw new Error(`Patterns konnten nicht gespeichert werden: ${error.message}`);
    }
  }

  const { error: reportError } = await supabase.from("pattern_reports").upsert(
    {
      organization_id: run.organization_id,
      run_id,
      report: resolvedReport as Json,
      model: PATTERN_SYNTHESIS_MODEL,
      input_tokens: totals.inputTokens,
      output_tokens: totals.outputTokens,
    },
    { onConflict: "run_id" },
  );
  if (reportError) {
    throw new Error(`Report konnte nicht gespeichert werden: ${reportError.message}`);
  }

  await mergeCostBreakdown(supabase, run_id, "anthropic", {
    opus: {
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      usd: Number(
        tokenCostUsd(
          PATTERN_SYNTHESIS_MODEL,
          totals.inputTokens,
          totals.outputTokens,
          { batch: true },
        ).toFixed(4),
      ),
    },
  } as Json);

  await mergePhaseCounts(supabase, run_id, { patterns: patternRows.length });
  await updateRun(supabase, run_id, {
    status: "completed",
    finished_at: new Date().toISOString(),
  });

  log.info("Synthese abgeschlossen", {
    runId: run_id,
    patterns: patternRows.length,
  });

  return {
    promptVersion: PATTERN_SYNTHESIS_PROMPT_VERSION,
    analyzed: items.length,
    patterns: patternRows.length,
  };
};
