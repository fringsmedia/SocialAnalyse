/**
 * Zentraler Produktname (Arbeitstitel). Wird überall referenziert,
 * damit eine spätere Umbenennung eine Ein-Zeilen-Änderung bleibt.
 */
export const PRODUCT_NAME = "Creative Intelligence";

/** Kurzform für Logo-Mark und kompakte Stellen. */
export const PRODUCT_MARK = "Ci";

/** Reihenfolge der Pipeline-Phasen eines Analysis-Runs. */
export const RUN_PHASES = [
  "profile",
  "collect",
  "filter",
  "score",
  "analyze",
  "synthesize",
  "generate",
] as const;

export type RunPhase = (typeof RUN_PHASES)[number];

/** Defaults der Pipeline – konfigurierbar pro Run über analysis_runs.config. */
export const PIPELINE_DEFAULTS = {
  /** Ziel-Sammelmenge in COLLECT. */
  collectTargetMin: 1000,
  collectTargetMax: 2000,
  /** Relevanz-Schwelle (0–10) in FILTER. */
  relevanceThreshold: 6,
  /** Mix-Quote für den Analyse-Pool in SCORE. */
  categoryMix: { core: 0.7, adjacent: 0.2, foreign: 0.1 },
  /** Top-N Creatives, die in die tiefe Analyse gehen. */
  topN: 80,
  /** Gewichte des organischen Performance-Scores. */
  organicScoreWeights: { outlier: 0.45, engagement: 0.3, velocity: 0.25 },
  /** Shares und Saves zählen doppelt gegenüber Likes. */
  shareSaveWeight: 2,
  /** Anzahl letzter Posts für den Account-Median. */
  accountMedianWindow: 30,
  /** Max. Frames pro Creative in ANALYZE. */
  maxFramesPerCreative: 8,
  /** Frame-Breite in Pixeln. */
  frameWidth: 512,
  /** Diversität: max. Creatives pro Cluster im Ranking. */
  maxCreativesPerCluster: 5,
} as const;

/** Supabase-Storage-Bucket für Thumbnails und Frames (WebP). */
export const STORAGE_BUCKET_CREATIVES = "creatives";
