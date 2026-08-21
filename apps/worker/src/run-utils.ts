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

/**
 * Kosteneintrag in cost_breakdown mergen. Objekte werden eine Ebene
 * tief gemergt (z. B. anthropic.haiku neben anthropic.sonnet).
 */
export async function mergeCostBreakdown(
  supabase: ServiceClient,
  runId: string,
  key: string,
  value: Json,
): Promise<void> {
  const run = await getRun(supabase, runId);
  const current = (run.cost_breakdown ?? {}) as Record<string, Json>;
  const existing = current[key];
  const merged =
    existing &&
    typeof existing === "object" &&
    !Array.isArray(existing) &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? ({ ...existing, ...value } as Json)
      : value;
  await updateRun(supabase, runId, {
    cost_breakdown: { ...current, [key]: merged } as Json,
  });
}

/** Alle Creatives eines Runs paginiert laden (Supabase-Limit 1000/Seite). */
export async function fetchAllCreatives<T>(
  supabase: ServiceClient,
  runId: string,
  columns: string,
  opts: { onlyUnfiltered?: boolean; minRelevance?: number } = {},
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("creatives")
      .select(columns)
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (opts.onlyUnfiltered) query = query.is("relevance_score", null);
    if (opts.minRelevance != null) {
      query = query.gte("relevance_score", opts.minRelevance);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Creatives laden fehlgeschlagen: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

/** Updates in kleinen parallelen Chunks ausführen. */
export async function runChunked<T>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    await Promise.all(items.slice(i, i + chunkSize).map(fn));
  }
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
