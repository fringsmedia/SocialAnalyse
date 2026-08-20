import type { JobHandler } from "./types";
import { ping } from "./ping";

/**
 * Registry aller Job-Handler. Die Pipeline-Handler (collect, filter,
 * score, analyze_creative, synthesize, generate) kommen in den
 * Phasen 1–5 hinzu; die Queue-Mechanik hier bleibt unverändert.
 */
export const handlers: Record<string, JobHandler> = {
  ping,
};
