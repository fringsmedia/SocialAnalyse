import { describe, expect, it } from "vitest";
import { resolveRetryPlan } from "./retry";

describe("resolveRetryPlan", () => {
  it("startet ohne Fortschritt beim Sammeln", () => {
    expect(resolveRetryPlan({})).toEqual({
      jobType: "collect",
      status: "queued",
    });
  });

  it("setzt nach dem Sammeln beim Filtern auf", () => {
    expect(resolveRetryPlan({ collected: 1200 })).toEqual({
      jobType: "filter",
      status: "collecting",
    });
  });

  it("setzt nach dem Filtern beim Scoring auf", () => {
    expect(resolveRetryPlan({ collected: 1200, relevant: 300 })).toEqual({
      jobType: "score",
      status: "filtering",
    });
  });

  it("setzt nach dem Scoring bei der Analyse auf", () => {
    expect(
      resolveRetryPlan({ collected: 1200, relevant: 300, pool: 80 }),
    ).toEqual({ jobType: "analyze", status: "scoring" });
  });

  it("setzt nach der Analyse bei der Synthese auf", () => {
    expect(
      resolveRetryPlan({ collected: 1200, relevant: 300, pool: 80, analyzed: 78 }),
    ).toEqual({ jobType: "synthesize", status: "analyzing" });
  });
});
