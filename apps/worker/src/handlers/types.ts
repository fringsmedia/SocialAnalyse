import type { Tables } from "@ci/db";
import type { WorkerEnv } from "@ci/shared";
import type { ServiceClient } from "../supabase";

export type Job = Tables<"job_queue">;

export interface HandlerContext {
  supabase: ServiceClient;
  env: WorkerEnv;
  job: Job;
  /** Prüft, ob dieser Worker einen Handler für den Job-Typ registriert hat. */
  hasHandler: (jobType: string) => boolean;
}

/**
 * Ein Handler verarbeitet genau einen Job-Typ. Rückgabewert wird als
 * job_queue.result gespeichert; eine geworfene Exception führt zu
 * fail_job (Retry mit Backoff bzw. terminal 'failed').
 */
export type JobHandler = (ctx: HandlerContext) => Promise<Record<string, unknown>>;
