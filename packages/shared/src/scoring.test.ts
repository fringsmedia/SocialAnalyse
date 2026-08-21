import { describe, expect, it } from "vitest";
import {
  engagementRate,
  median,
  outlierScore,
  rankNormalize,
  scoreAdCreatives,
  scoreOrganicCreatives,
  selectAnalysisPool,
  velocity,
  type OrganicMetricsInput,
} from "./scoring";

const NOW = new Date("2026-08-21T12:00:00Z").getTime();

function metrics(overrides: Partial<OrganicMetricsInput>): OrganicMetricsInput {
  return {
    plays: 10_000,
    likes: 500,
    comments: 50,
    shares: 20,
    saves: 30,
    publishedAt: "2026-08-11T12:00:00Z", // 10 Tage alt
    accountMedianViews: 5_000,
    ...overrides,
  };
}

describe("median", () => {
  it("berechnet Median für ungerade und gerade Längen", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("engagementRate", () => {
  it("gewichtet Shares und Saves doppelt gegenüber Likes", () => {
    // (500 Likes + 50 Kommentare + 2*(20+30)) / 10000 = 0.065
    expect(engagementRate(metrics({}))).toBeCloseTo(0.065, 5);
  });

  it("liefert 0 ohne Views", () => {
    expect(engagementRate(metrics({ plays: 0 }))).toBe(0);
  });
});

describe("outlierScore & velocity", () => {
  it("outlier = views / Account-Median", () => {
    expect(outlierScore(60_000, 5_000)).toBe(12);
    expect(outlierScore(60_000, null)).toBe(1); // ohne Median neutral
  });

  it("velocity = views / Tage seit Veröffentlichung", () => {
    expect(velocity(10_000, "2026-08-11T12:00:00Z", NOW)).toBeCloseTo(1000, 0);
  });
});

describe("rankNormalize", () => {
  it("bildet auf 0..1 nach Rang ab", () => {
    expect(rankNormalize([10, 30, 20])).toEqual([0, 1, 0.5]);
    expect(rankNormalize([7])).toEqual([1]);
  });
});

describe("scoreOrganicCreatives", () => {
  it("gibt dem klaren Outlier den höchsten Score", () => {
    const scored = scoreOrganicCreatives(
      [
        { id: "viral", metrics: metrics({ plays: 120_000 }) }, // 24× Median
        { id: "normal", metrics: metrics({ plays: 5_000, likes: 100 }) },
        { id: "schwach", metrics: metrics({ plays: 1_000, likes: 5, shares: 0, saves: 0 }) },
      ],
      undefined,
      NOW,
    );
    const viral = scored.get("viral")!;
    expect(viral.score).toBeGreaterThan(scored.get("normal")!.score);
    expect(scored.get("normal")!.score).toBeGreaterThan(
      scored.get("schwach")!.score,
    );
    expect(viral.breakdown.outlier).toBe(24);
  });
});

describe("scoreAdCreatives", () => {
  it("belohnt Laufzeit, Reichweite, Varianten und Plattformbreite", () => {
    const scored = scoreAdCreatives([
      {
        id: "dauerbrenner",
        longevityDays: 90,
        variantCount: 6,
        platformCount: 3,
        euReach: 500_000,
      },
      {
        id: "frisch",
        longevityDays: 3,
        variantCount: 1,
        platformCount: 1,
        euReach: 10_000,
      },
    ]);
    expect(scored.get("dauerbrenner")!.score).toBe(100);
    expect(scored.get("frisch")!.score).toBe(0);
  });
});

describe("selectAnalysisPool", () => {
  const candidates = [
    ...Array.from({ length: 100 }, (_, i) => ({
      id: `core-${i}`,
      category: "core" as const,
      score: 100 - i,
    })),
    ...Array.from({ length: 30 }, (_, i) => ({
      id: `adj-${i}`,
      category: "adjacent" as const,
      score: 90 - i,
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `for-${i}`,
      category: "foreign" as const,
      score: 80 - i,
    })),
  ];

  it("hält die Mix-Quote 70/20/10 bei ausreichend Kandidaten", () => {
    const pool = selectAnalysisPool(candidates, 80);
    expect(pool).toHaveLength(80);
    expect(pool.filter((id) => id.startsWith("core-"))).toHaveLength(56);
    expect(pool.filter((id) => id.startsWith("adj-"))).toHaveLength(16);
    expect(pool.filter((id) => id.startsWith("for-"))).toHaveLength(8);
  });

  it("füllt fehlende Kategorien nach Score auf", () => {
    const onlyCore = candidates.filter((c) => c.category === "core");
    const pool = selectAnalysisPool(onlyCore, 80);
    expect(pool).toHaveLength(80);
    expect(pool[0]).toBe("core-0");
  });

  it("dedupliziert und respektiert topN", () => {
    const pool = selectAnalysisPool(candidates, 40);
    expect(new Set(pool).size).toBe(40);
  });
});
