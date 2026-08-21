import type { RunConfig } from "./run-config";

/**
 * Kostenmodell für die Schätzung vor Run-Start und das Tracking.
 * Preise: Anthropic-API-Listenpreise (USD pro 1M Tokens), Stand 2026-06.
 */
export const MODEL_PRICING = {
  /** Opus 5 – Profil, Synthese, Generierung. */
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
  /** Sonnet 5 – Frame-Analyse pro Creative. */
  "claude-sonnet-5": { inputPerMTok: 3, outputPerMTok: 15 },
  /** Haiku 4.5 – Massen-Klassifikation. */
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
} as const;

export type ModelName = keyof typeof MODEL_PRICING;

/** Batch API: 50 % Rabatt auf alle nicht-interaktiven Schritte. */
export const BATCH_DISCOUNT = 0.5;

/** OpenAI Whisper API. */
export const WHISPER_USD_PER_MINUTE = 0.006;

/** Apify-Actors, grobe Pay-per-Result-Sätze (USD pro 1.000 Items). */
export const APIFY_USD_PER_1000 = {
  tiktok: 0.5,
  instagram: 2.5,
} as const;

export function tokenCostUsd(
  model: ModelName,
  inputTokens: number,
  outputTokens: number,
  opts: { batch?: boolean } = {},
): number {
  const p = MODEL_PRICING[model];
  const raw =
    (inputTokens / 1_000_000) * p.inputPerMTok +
    (outputTokens / 1_000_000) * p.outputPerMTok;
  return opts.batch ? raw * BATCH_DISCOUNT : raw;
}

export interface RunCostEstimate {
  collectUsd: number;
  filterUsd: number;
  analyzeUsd: number;
  synthesizeUsd: number;
  transcriptionUsd: number;
  totalUsd: number;
}

/**
 * Grobe Vorab-Schätzung eines Runs für Schritt 3 des Anlage-Flows.
 *
 * Annahmen (bewusst konservativ, dokumentiert für die UI):
 * - FILTER: ~600 Input- / 60 Output-Tokens pro Item (Haiku, Batch)
 * - ANALYZE: ~4.000 Input- (inkl. Frames) / 700 Output-Tokens pro
 *   Top-N-Creative (Sonnet, Batch)
 * - SYNTHESIZE: ~350 Input-Tokens pro analysiertem Creative plus
 *   6.000 Output-Tokens Report (Opus, Batch)
 * - Transkription: Ø 35 s pro organischem Top-N-Video (~60 %)
 */
export function estimateRunCost(config: RunConfig): RunCostEstimate {
  const items = config.collectTarget;
  const topN = config.topN;

  const organicShare =
    config.platforms.filter((p) => p !== "meta_ad").length /
    config.platforms.length;
  const organicItems = Math.round(items * organicShare);
  const tiktokItems = config.platforms.includes("tiktok")
    ? Math.round(organicItems / (config.platforms.includes("instagram") ? 2 : 1))
    : 0;
  const instagramItems = config.platforms.includes("instagram")
    ? organicItems - tiktokItems
    : 0;

  const collectUsd =
    (tiktokItems / 1000) * APIFY_USD_PER_1000.tiktok +
    (instagramItems / 1000) * APIFY_USD_PER_1000.instagram;

  const filterUsd = tokenCostUsd("claude-haiku-4-5", items * 600, items * 60, {
    batch: true,
  });

  const analyzeUsd = tokenCostUsd(
    "claude-sonnet-5",
    topN * 4000,
    topN * 700,
    { batch: true },
  );

  const synthesizeUsd = tokenCostUsd(
    "claude-opus-5",
    topN * 350 + 4000,
    6000,
    { batch: true },
  );

  const transcriptionUsd =
    Math.round(topN * organicShare) * (35 / 60) * WHISPER_USD_PER_MINUTE;

  const totalUsd =
    collectUsd + filterUsd + analyzeUsd + synthesizeUsd + transcriptionUsd;

  return {
    collectUsd,
    filterUsd,
    analyzeUsd,
    synthesizeUsd,
    transcriptionUsd,
    totalUsd,
  };
}
