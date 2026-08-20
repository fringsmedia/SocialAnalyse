/** Status-Maschine eines Analysis-Runs. */
export type RunStatus =
  | "draft"
  | "queued"
  | "collecting"
  | "filtering"
  | "scoring"
  | "analyzing"
  | "synthesizing"
  | "completed"
  | "failed"
  | "cancelled";

export type CreativeSource = "meta_ad" | "tiktok" | "instagram";

export type CreativeCategory = "core" | "adjacent" | "foreign";

export type PatternType =
  | "hook"
  | "structure"
  | "offer_framing"
  | "cta"
  | "visual";

export type MemberRole = "owner" | "admin" | "member";

export type FeedbackVerdict = "fits" | "does_not_fit";

export type JobStatus = "pending" | "running" | "succeeded" | "failed";

/**
 * Alle Job-Typen der Worker-Queue. `ping` ist der Gesundheitscheck
 * (verifiziert Queue-Mechanik end-to-end); die Pipeline-Jobs kommen
 * in den Phasen 1–5 mit ihren Handlern dazu.
 */
export const JOB_TYPES = [
  "ping",
  "generate_profile",
  "collect",
  "filter",
  "score",
  "analyze_creative",
  "synthesize",
  "generate",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

/** Zähler pro Phase, live in analysis_runs.phase_counts gepflegt. */
export interface PhaseCounts {
  collected?: number;
  relevant?: number;
  scored?: number;
  analyzed?: number;
  patterns?: number;
}

/** Kosten-Tracking pro Run in analysis_runs.cost_breakdown. */
export interface CostBreakdown {
  anthropic?: Partial<
    Record<
      "haiku" | "sonnet" | "opus",
      { inputTokens: number; outputTokens: number; usd?: number }
    >
  >;
  openai?: { whisperSeconds?: number; usd?: number };
  apify?: { events?: number; usd?: number };
}
