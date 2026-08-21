import type { JobHandler } from "./types";
import { analyze } from "./analyze";
import { collect } from "./collect";
import { filter } from "./filter";
import { generate } from "./generate";
import { generateProfile } from "./generate-profile";
import { ping } from "./ping";
import { score } from "./score";
import { synthesize } from "./synthesize";

/** Registry aller Job-Handler – die komplette Pipeline. */
export const handlers: Record<string, JobHandler> = {
  ping,
  generate_profile: generateProfile,
  collect,
  filter,
  score,
  analyze,
  synthesize,
  generate,
};
