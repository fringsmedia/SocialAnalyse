import type { Json, Tables, TablesUpdate } from "@ci/db";
import type { ServiceClient } from "./supabase";

export type RunRow = Tables<"analysis_runs">;

export async function getRun(
  supabase: ServiceClient,
  runId: string,
): Promise<RunRow> {
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("id", runId)
    .single();
  if (error || !data) {
    throw new Error(`Run ${runId} nicht gefunden: ${error?.message}`);
  }
  return data;
}

export async function updateRun(
  supabase: ServiceClient,
  runId: string,
  patch: TablesUpdate<"analysis_runs">,
): Promise<void> {
  const { error } = await supabase
    .from("analysis_runs")
    .update(patch)
    .eq("id", runId);
  if (error) {
    throw new Error(`Run-Update fehlgeschlagen (${runId}): ${error.message}`);
  }
}

/** Zähler in phase_counts mergen (Read-Modify-Write; ein Job pro Run-Phase). */
export async function mergePhaseCounts(
  supabase: ServiceClient,
  runId: string,
  counts: Record<string, number>,
): Promise<void> {
  const run = await getRun(supabase, runId);
  const current = (run.phase_counts ?? {}) as Record<string, unknown>;
  await updateRun(supabase, runId, {
    phase_counts: { ...current, ...counts } as Json,
  });
}

/** Kosteneintrag in cost_breakdown mergen (flacher Pfad, z. B. "apify"). */
export async function mergeCostBreakdown(
  supabase: ServiceClient,
  runId: string,
  key: string,
  value: Json,
): Promise<void> {
  const run = await getRun(supabase, runId);
  const current = (run.cost_breakdown ?? {}) as Record<string, Json>;
  await updateRun(supabase, runId, {
    cost_breakdown: { ...current, [key]: value } as Json,
  });
}

export async function appendRunError(
  supabase: ServiceClient,
  runId: string,
  entry: { phase: string; message: string; detail?: string },
): Promise<void> {
  const run = await getRun(supabase, runId);
  const log = Array.isArray(run.error_log) ? (run.error_log as Json[]) : [];
  await updateRun(supabase, runId, {
    error_log: [
      ...log,
      { at: new Date().toISOString(), ...entry },
    ] as Json,
  });
}
