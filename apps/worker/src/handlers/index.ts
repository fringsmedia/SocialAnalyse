import type { JobHandler } from "./types";
import { collect } from "./collect";
import { filter } from "./filter";
import { generateProfile } from "./generate-profile";
import { ping } from "./ping";
import { score } from "./score";

/**
 * Registry aller Job-Handler. Die weiteren Pipeline-Handler
 * (analyze, synthesize, generate) kommen in den Phasen 3–5 hinzu;
 * die Queue-Mechanik bleibt unverändert.
 */
export const handlers: Record<string, JobHandler> = {
  ping,
  generate_profile: generateProfile,
  collect,
  filter,
  score,
};
