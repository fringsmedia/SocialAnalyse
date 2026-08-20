import type { Tables } from "@ci/db";
import type { ServiceClient } from "../supabase";

export type Job = Tables<"job_queue">;

export interface HandlerContext {
  supabase: ServiceClient;
  job: Job;
}

/**
 * Ein Handler verarbeitet genau einen Job-Typ. Rückgabewert wird als
 * job_queue.result gespeichert; eine geworfene Exception führt zu
 * fail_job (Retry mit Backoff bzw. terminal 'failed').
 */
export type JobHandler = (ctx: HandlerContext) => Promise<Record<string, unknown>>;
