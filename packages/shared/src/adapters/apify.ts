import { z } from "zod";
import { sleep } from "../utils";
import type { FetchLike } from "./types";

/**
 * Generischer Apify-Runner: Actor starten, Status pollen, Dataset lesen.
 * Es werden ausschließlich Metadaten-Items geladen – keine Videos.
 */

const APIFY_BASE = "https://api.apify.com/v2";

const startRunSchema = z.looseObject({
  data: z.looseObject({
    id: z.string(),
    defaultDatasetId: z.string(),
    status: z.string(),
  }),
});

const runStatusSchema = z.looseObject({
  data: z.looseObject({
    status: z.string(),
    defaultDatasetId: z.string().optional(),
  }),
});

const TERMINAL_SUCCESS = new Set(["SUCCEEDED"]);
const TERMINAL_FAILURE = new Set(["FAILED", "ABORTED", "TIMED-OUT"]);

export interface ApifyRunner {
  runActor(
    actorId: string,
    input: Record<string, unknown>,
    opts: { maxItems: number },
  ): Promise<unknown[]>;
}

export function createApifyRunner(opts: {
  token: string;
  fetchImpl?: FetchLike;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}): ApifyRunner {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const pollIntervalMs = opts.pollIntervalMs ?? 5000;
  const maxWaitMs = opts.maxWaitMs ?? 15 * 60_000;

  async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
    const response = await fetchImpl(url, init);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Apify ${response.status}: ${body.slice(0, 300)}`);
    }
    return response.json();
  }

  return {
    async runActor(actorId, input, { maxItems }) {
      // Actor-IDs im Format "owner/name" → API-Pfad "owner~name"
      const actorPath = actorId.replace("/", "~");

      const started = startRunSchema.parse(
        await requestJson(
          `${APIFY_BASE}/acts/${actorPath}/runs?token=${opts.token}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
          },
        ),
      );

      const runId = started.data.id;
      let datasetId = started.data.defaultDatasetId;
      let status = started.data.status;
      const deadline = Date.now() + maxWaitMs;

      while (!TERMINAL_SUCCESS.has(status)) {
        if (TERMINAL_FAILURE.has(status)) {
          throw new Error(`Apify-Run ${runId} endete mit Status ${status}`);
        }
        if (Date.now() > deadline) {
          throw new Error(`Apify-Run ${runId} überschritt das Zeitlimit`);
        }
        await sleep(pollIntervalMs);
        const polled = runStatusSchema.parse(
          await requestJson(
            `${APIFY_BASE}/actor-runs/${runId}?token=${opts.token}`,
          ),
        );
        status = polled.data.status;
        datasetId = polled.data.defaultDatasetId ?? datasetId;
      }

      const items = await requestJson(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${opts.token}&format=json&clean=true&limit=${maxItems}`,
      );
      return Array.isArray(items) ? items : [];
    },
  };
}
