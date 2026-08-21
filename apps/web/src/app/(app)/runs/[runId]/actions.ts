"use server";

import { revalidatePath } from "next/cache";
import { resolveRetryPlan, type PhaseCounts } from "@ci/shared";
import { getAuthContext } from "@/lib/auth";

const CANCELLABLE = new Set([
  "queued",
  "collecting",
  "filtering",
  "scoring",
  "analyzing",
  "synthesizing",
]);

/** Bricht einen laufenden Run ab; Worker-Handler prüfen den Status. */
export async function cancelRunAction(runId: string): Promise<void> {
  const { supabase } = await getAuthContext();
  const { data: run } = await supabase
    .from("analysis_runs")
    .select("id, status")
    .eq("id", runId)
    .maybeSingle();
  if (!run || !CANCELLABLE.has(run.status)) return;

  await supabase
    .from("analysis_runs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", runId);

  revalidatePath(`/runs/${runId}`);
}

/**
 * Fehlgeschlagenen Run wieder anstoßen: setzt anhand der Phasen-Zähler
 * an der letzten erreichten Phase auf und reiht den passenden Job ein.
 */
export async function retryRunAction(runId: string): Promise<void> {
  const { supabase } = await getAuthContext();
  const { data: run } = await supabase
    .from("analysis_runs")
    .select("id, organization_id, status, phase_counts")
    .eq("id", runId)
    .maybeSingle();
  if (!run || run.status !== "failed") return;

  const plan = resolveRetryPlan((run.phase_counts ?? {}) as PhaseCounts);

  await supabase
    .from("analysis_runs")
    .update({ status: plan.status, finished_at: null })
    .eq("id", runId);

  await supabase.from("job_queue").insert({
    organization_id: run.organization_id,
    run_id: runId,
    job_type: plan.jobType,
    payload: { run_id: runId },
  });

  revalidatePath(`/runs/${runId}`);
}
