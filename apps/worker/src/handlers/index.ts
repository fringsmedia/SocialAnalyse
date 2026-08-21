import type { JobHandler } from "./types";
import { collect } from "./collect";
import { generateProfile } from "./generate-profile";
import { ping } from "./ping";

/**
 * Registry aller Job-Handler. Die weiteren Pipeline-Handler (filter,
 * score, analyze_creative, synthesize, generate) kommen in den
 * Phasen 2–5 hinzu; die Queue-Mechanik bleibt unverändert.
 */
export const handlers: Record<string, JobHandler> = {
  ping,
  generate_profile: generateProfile,
  collect,
};
