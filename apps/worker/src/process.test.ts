import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@ci/shared";
import type { Job } from "./handlers/types";
import { ping } from "./handlers/ping";
import { processClaimedJob } from "./process";
import type { ServiceClient } from "./supabase";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    organization_id: null,
    run_id: null,
    job_type: "ping",
    payload: { hello: "welt" },
    status: "running",
    priority: 0,
    attempts: 1,
    max_attempts: 3,
    run_after: new Date().toISOString(),
    locked_by: "worker-test",
    locked_at: new Date().toISOString(),
    last_error: null,
    result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Die Dispatch-Logik ist DB-frei; ein leeres Objekt genügt als Kontext.
const context = {
  supabase: {} as ServiceClient,
  env: {} as WorkerEnv,
  hasHandler: () => false,
};

describe("processClaimedJob", () => {
  it("führt den ping-Handler aus und spiegelt den Payload", async () => {
    const outcome = await processClaimedJob(makeJob(), { ping }, context);
    expect(outcome.status).toBe("succeeded");
    if (outcome.status === "succeeded") {
      expect(outcome.result.pong).toBe(true);
      expect(outcome.result.receivedPayload).toEqual({ hello: "welt" });
    }
  });

  it("meldet unbekannte Job-Typen als failed", async () => {
    const outcome = await processClaimedJob(
      makeJob({ job_type: "unbekannt" }),
      { ping },
      context,
    );
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.error).toContain("unbekannt");
    }
  });

  it("fängt Handler-Exceptions und liefert failed", async () => {
    const outcome = await processClaimedJob(
      makeJob(),
      {
        ping: async () => {
          throw new Error("kaputt");
        },
      },
      context,
    );
    expect(outcome).toEqual({ status: "failed", error: "kaputt" });
  });
});
