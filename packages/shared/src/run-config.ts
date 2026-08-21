import { z } from "zod";
import { PIPELINE_DEFAULTS } from "./constants";

/** Regionen für die Sammlung (Meta Ad Library ad_reached_countries). */
export const RUN_REGIONS = ["DE", "AT", "CH", "EU", "US", "GB"] as const;
export type RunRegion = (typeof RUN_REGIONS)[number];

export const RUN_PLATFORMS = ["meta_ad", "tiktok", "instagram"] as const;
export type RunPlatform = (typeof RUN_PLATFORMS)[number];

/** Auswahl für die Analyse-Tiefe (Top-N). */
export const TOP_N_OPTIONS = [40, 80, 120] as const;

/** Konfiguration eines Analysis-Runs (analysis_runs.config). */
export const runConfigSchema = z.object({
  region: z.enum(RUN_REGIONS).default("DE"),
  platforms: z
    .array(z.enum(RUN_PLATFORMS))
    .min(1)
    .default([...RUN_PLATFORMS]),
  topN: z.number().int().positive().default(PIPELINE_DEFAULTS.topN),
  collectTarget: z
    .number()
    .int()
    .positive()
    .default(PIPELINE_DEFAULTS.collectTargetMax),
  relevanceThreshold: z
    .number()
    .min(0)
    .max(10)
    .default(PIPELINE_DEFAULTS.relevanceThreshold),
});

export type RunConfig = z.infer<typeof runConfigSchema>;

/** Region → Ländercodes für die Meta Ad Library (ad_reached_countries). */
export const REGION_COUNTRIES: Record<RunRegion, string[]> = {
  DE: ["DE"],
  AT: ["AT"],
  CH: ["CH"],
  EU: [
    "DE",
    "AT",
    "FR",
    "IT",
    "ES",
    "NL",
    "BE",
    "PL",
    "SE",
    "DK",
    "FI",
    "IE",
    "PT",
    "CZ",
  ],
  US: ["US"],
  GB: ["GB"],
};
