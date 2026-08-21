import { PIPELINE_DEFAULTS } from "./constants";
import type { CreativeCategory } from "./types";

/**
 * SCORE-Phase: Performance relativ bewerten, nicht absolut.
 * Alle Funktionen sind pur und ohne DB-Zugriff – die Worker-Handler
 * liefern die Inputs, die Unit-Tests decken die Logik ab.
 */

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export interface OrganicMetricsInput {
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  publishedAt: string | null;
  /** Median-Views des Accounts (letzte Posts) – Basis des Outlier-Scores. */
  accountMedianViews: number | null;
}

/** Shares und Saves zählen doppelt gegenüber Likes (PIPELINE_DEFAULTS). */
export function engagementRate(
  m: Pick<OrganicMetricsInput, "plays" | "likes" | "comments" | "shares" | "saves">,
  shareSaveWeight = PIPELINE_DEFAULTS.shareSaveWeight,
): number {
  if (m.plays <= 0) return 0;
  return (
    (m.likes + m.comments + shareSaveWeight * (m.shares + m.saves)) / m.plays
  );
}

export function daysSince(iso: string | null, now = Date.now()): number {
  if (!iso) return 30;
  const diff = (now - new Date(iso).getTime()) / 86_400_000;
  return Math.max(diff, 0.5);
}

/** Views relativ zum Account-Schnitt ("12× über Account-Schnitt"). */
export function outlierScore(
  plays: number,
  accountMedianViews: number | null,
): number {
  if (!accountMedianViews || accountMedianViews <= 0) return 1;
  return plays / accountMedianViews;
}

export function velocity(plays: number, publishedAt: string | null, now = Date.now()): number {
  return plays / daysSince(publishedAt, now);
}

/**
 * Rang-Normalisierung auf 0–1 innerhalb des Runs: robust gegen
 * Ausreißer und unterschiedliche Größenordnungen der Rohmetriken.
 */
export function rankNormalize(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [1];
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(n);
  for (let pos = 0; pos < n; pos++) {
    ranks[indexed[pos]!.index] = pos / (n - 1);
  }
  return ranks;
}

export interface ScoredResult {
  /** Gesamtscore 0–100. */
  score: number;
  breakdown: Record<string, number>;
}

export interface OrganicScoreItem {
  id: string;
  metrics: OrganicMetricsInput;
}

export function scoreOrganicCreatives(
  items: OrganicScoreItem[],
  weights = PIPELINE_DEFAULTS.organicScoreWeights,
  now = Date.now(),
): Map<string, ScoredResult> {
  const outliers = items.map((i) =>
    outlierScore(i.metrics.plays, i.metrics.accountMedianViews),
  );
  const engagements = items.map((i) => engagementRate(i.metrics));
  const velocities = items.map((i) =>
    velocity(i.metrics.plays, i.metrics.publishedAt, now),
  );

  const outlierRanks = rankNormalize(outliers);
  const engagementRanks = rankNormalize(engagements);
  const velocityRanks = rankNormalize(velocities);

  const result = new Map<string, ScoredResult>();
  items.forEach((item, i) => {
    const score =
      100 *
      (weights.outlier * outlierRanks[i]! +
        weights.engagement * engagementRanks[i]! +
        weights.velocity * velocityRanks[i]!);
    result.set(item.id, {
      score: Number(score.toFixed(2)),
      breakdown: {
        outlier: Number(outliers[i]!.toFixed(3)),
        engagement_rate: Number(engagements[i]!.toFixed(5)),
        velocity: Number(velocities[i]!.toFixed(2)),
        outlier_rank: Number(outlierRanks[i]!.toFixed(4)),
        engagement_rank: Number(engagementRanks[i]!.toFixed(4)),
        velocity_rank: Number(velocityRanks[i]!.toFixed(4)),
      },
    });
  });
  return result;
}

export interface AdScoreItem {
  id: string;
  /** Laufzeit in Tagen (delivery_start bis stop bzw. heute). */
  longevityDays: number;
  /** Varianten derselben Kampagne (Näherung: Ads derselben Page im Run). */
  variantCount: number;
  /** Anzahl Publisher-Plattformen. */
  platformCount: number;
  /** EU-Reichweite aus der Ad Library (DSA), falls vorhanden. */
  euReach: number | null;
}

export const AD_SCORE_WEIGHTS = {
  longevity: 0.35,
  reach: 0.3,
  variants: 0.2,
  breadth: 0.15,
} as const;

export function scoreAdCreatives(
  items: AdScoreItem[],
  weights = AD_SCORE_WEIGHTS,
): Map<string, ScoredResult> {
  const longevities = rankNormalize(items.map((i) => i.longevityDays));
  const reaches = rankNormalize(items.map((i) => i.euReach ?? 0));
  const variants = rankNormalize(items.map((i) => i.variantCount));
  const breadths = rankNormalize(items.map((i) => i.platformCount));

  const result = new Map<string, ScoredResult>();
  items.forEach((item, i) => {
    const score =
      100 *
      (weights.longevity * longevities[i]! +
        weights.reach * reaches[i]! +
        weights.variants * variants[i]! +
        weights.breadth * breadths[i]!);
    result.set(item.id, {
      score: Number(score.toFixed(2)),
      breakdown: {
        longevity_days: Number(item.longevityDays.toFixed(1)),
        eu_reach: item.euReach ?? 0,
        variant_count: item.variantCount,
        platform_count: item.platformCount,
        longevity_rank: Number(longevities[i]!.toFixed(4)),
        reach_rank: Number(reaches[i]!.toFixed(4)),
        variant_rank: Number(variants[i]!.toFixed(4)),
        breadth_rank: Number(breadths[i]!.toFixed(4)),
      },
    });
  });
  return result;
}

export interface PoolCandidate {
  id: string;
  category: CreativeCategory;
  score: number;
}

/**
 * Auswahl des Analyse-Pools (Top-N) mit Mix-Quote 70/20/10
 * (Kern/Nachbar/fremd). Fehlen Items in einer Kategorie, füllen die
 * anderen nach Score auf.
 */
export function selectAnalysisPool(
  candidates: PoolCandidate[],
  topN: number = PIPELINE_DEFAULTS.topN,
  mix: { core: number; adjacent: number; foreign: number } = PIPELINE_DEFAULTS.categoryMix,
): string[] {
  const byCategory: Record<CreativeCategory, PoolCandidate[]> = {
    core: [],
    adjacent: [],
    foreign: [],
  };
  for (const c of candidates) byCategory[c.category].push(c);
  for (const list of Object.values(byCategory)) {
    list.sort((a, b) => b.score - a.score);
  }

  const quotas: Record<CreativeCategory, number> = {
    core: Math.round(topN * mix.core),
    adjacent: Math.round(topN * mix.adjacent),
    foreign: Math.round(topN * mix.foreign),
  };

  const selected: string[] = [];
  const taken = new Set<string>();
  (Object.keys(quotas) as CreativeCategory[]).forEach((category) => {
    for (const c of byCategory[category].slice(0, quotas[category])) {
      selected.push(c.id);
      taken.add(c.id);
    }
  });

  // Auffüllen bis topN – global nach Score.
  if (selected.length < topN) {
    const rest = candidates
      .filter((c) => !taken.has(c.id))
      .sort((a, b) => b.score - a.score);
    for (const c of rest) {
      if (selected.length >= topN) break;
      selected.push(c.id);
      taken.add(c.id);
    }
  }

  return selected.slice(0, topN);
}
