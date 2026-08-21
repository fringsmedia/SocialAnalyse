import { randomUUID } from "node:crypto";
import { parseEnv, sleep, workerEnvSchema } from "@ci/shared";
import type { Json } from "@ci/db";
import { handlers } from "./handlers";
import { log } from "./log";
import { processClaimedJob } from "./process";
import { createServiceClient } from "./supabase";

const env = parseEnv(workerEnvSchema, process.env);
const workerId = env.WORKER_ID ?? `worker-${randomUUID().slice(0, 8)}`;
const supabase = createServiceClient(env);

let shuttingDown = false;
let currentJobId: string | null = null;

async function pollOnce(): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_next_job", {
    p_worker_id: workerId,
  });

  if (error) {
    log.error("claim_next_job fehlgeschlagen", { error: error.message });
    return false;
  }

  const job = data?.[0];
  if (!job) return false;

  currentJobId = job.id;
  log.info("Job geclaimt", {
    jobId: job.id,
    jobType: job.job_type,
    attempt: job.attempts,
  });

  const outcome = await processClaimedJob(job, handlers, {
    supabase,
    env,
    hasHandler: (jobType) => jobType in handlers,
  });

  if (outcome.status === "succeeded") {
    const { error: completeError } = await supabase.rpc("complete_job", {
      p_job_id: job.id,
      p_result: outcome.result as Json,
    });
    if (completeError) {
      log.error("complete_job fehlgeschlagen", {
        jobId: job.id,
        error: completeError.message,
      });
    } else {
      log.info("Job abgeschlossen", { jobId: job.id, jobType: job.job_type });
    }
  } else {
    const { error: failError } = await supabase.rpc("fail_job", {
      p_job_id: job.id,
      p_error: outcome.error,
    });
    if (failError) {
      log.error("fail_job fehlgeschlagen", {
        jobId: job.id,
        error: failError.message,
      });
    } else {
      log.warn("Job fehlgeschlagen (Retry/terminal via Backoff-Regel)", {
        jobId: job.id,
        jobType: job.job_type,
        error: outcome.error,
      });
    }
  }

  currentJobId = null;
  return true;
}

async function main() {
  log.info("Worker gestartet", {
    workerId,
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    registeredHandlers: Object.keys(handlers),
  });

  while (!shuttingDown) {
    let hadJob = false;
    try {
      hadJob = await pollOnce();
    } catch (error) {
      log.error("Unerwarteter Fehler im Poll-Loop", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Direkt weiterpollen, solange Jobs anstehen; sonst Intervall warten.
    if (!hadJob && !shuttingDown) {
      await sleep(env.WORKER_POLL_INTERVAL_MS);
    }
  }

  log.info("Worker beendet", { workerId });
  process.exit(0);
}

function requestShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info("Shutdown angefordert – laufender Job wird noch beendet", {
    signal,
    currentJobId,
  });
}

process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

main().catch((error) => {
  log.error("Worker abgestürzt", {
    error: error instanceof Error ? error.stack : String(error),
  });
  process.exit(1);
});
