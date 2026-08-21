import type { PhaseCounts, RunStatus } from "./types";

/**
 * Fehler-Retry: bestimmt aus den Phasen-Zählern eines fehlgeschlagenen
 * Runs, an welcher Stelle die Pipeline wieder aufsetzt. Der Status wird
 * so gesetzt, dass die Idempotenz-Prüfung des Ziel-Handlers passiert.
 */
export interface RetryPlan {
  jobType: "collect" | "filter" | "score" | "analyze" | "synthesize";
  status: RunStatus;
}

export function resolveRetryPlan(counts: PhaseCounts): RetryPlan {
  if ((counts.analyzed ?? 0) > 0) {
    return { jobType: "synthesize", status: "analyzing" };
  }
  if ((counts.pool ?? 0) > 0) {
    return { jobType: "analyze", status: "scoring" };
  }
  if ((counts.relevant ?? 0) > 0) {
    return { jobType: "score", status: "filtering" };
  }
  if ((counts.collected ?? 0) > 0) {
    return { jobType: "filter", status: "collecting" };
  }
  return { jobType: "collect", status: "queued" };
}
