"use server";

import { revalidatePath } from "next/cache";
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
