import type { HandlerContext, Job, JobHandler } from "./handlers/types";

export type ProcessOutcome =
  | { status: "succeeded"; result: Record<string, unknown> }
  | { status: "failed"; error: string };

/**
 * Führt den passenden Handler für einen geclaimten Job aus.
 * Bewusst pur gehalten (keine DB-Aufrufe), damit die Dispatch-Logik
 * ohne laufende Supabase testbar ist.
 */
export async function processClaimedJob(
  job: Job,
  registry: Record<string, JobHandler>,
  context: Omit<HandlerContext, "job">,
): Promise<ProcessOutcome> {
  const handler = registry[job.job_type];
  if (!handler) {
    return {
      status: "failed",
      error: `Kein Handler für Job-Typ "${job.job_type}" registriert`,
    };
  }
  try {
    const result = await handler({ ...context, job });
    return { status: "succeeded", result };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
