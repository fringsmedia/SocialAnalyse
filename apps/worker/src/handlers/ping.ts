import type { JobHandler } from "./types";

/**
 * Gesundheitscheck der Queue: verifiziert Claim → Verarbeitung → Complete
 * end-to-end, ohne externe Abhängigkeiten. Payload wird zurückgespiegelt.
 */
export const ping: JobHandler = async ({ job }) => {
  return {
    pong: true,
    receivedPayload: job.payload,
    processedAt: new Date().toISOString(),
  };
};
