import { describe, expect, it } from "vitest";
import { estimateRunCost, tokenCostUsd } from "./costs";
import { runConfigSchema } from "./run-config";

describe("tokenCostUsd", () => {
  it("rechnet Listenpreise korrekt", () => {
    // 1M Input + 1M Output Haiku = 1 + 5 USD
    expect(tokenCostUsd("claude-haiku-4-5", 1_000_000, 1_000_000)).toBe(6);
  });

  it("wendet den Batch-Rabatt an", () => {
    expect(
      tokenCostUsd("claude-haiku-4-5", 1_000_000, 1_000_000, { batch: true }),
    ).toBe(3);
  });
});

describe("estimateRunCost", () => {
  it("liefert eine plausible Gesamtschätzung für den Default-Run", () => {
    const estimate = estimateRunCost(runConfigSchema.parse({}));
    expect(estimate.totalUsd).toBeGreaterThan(0.5);
    expect(estimate.totalUsd).toBeLessThan(20);
    expect(estimate.totalUsd).toBeCloseTo(
      estimate.collectUsd +
        estimate.filterUsd +
        estimate.analyzeUsd +
        estimate.synthesizeUsd +
        estimate.transcriptionUsd,
      6,
    );
  });

  it("skaliert mit der Analyse-Tiefe", () => {
    const shallow = estimateRunCost(runConfigSchema.parse({ topN: 40 }));
    const deep = estimateRunCost(runConfigSchema.parse({ topN: 120 }));
    expect(deep.analyzeUsd).toBeGreaterThan(shallow.analyzeUsd * 2);
  });

  it("berechnet ohne organische Plattformen keine Apify-Kosten", () => {
    const adsOnly = estimateRunCost(
      runConfigSchema.parse({ platforms: ["meta_ad"] }),
    );
    expect(adsOnly.collectUsd).toBe(0);
    expect(adsOnly.transcriptionUsd).toBe(0);
  });
});
