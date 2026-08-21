import { z } from "zod";

/**
 * Branchenprofil – das strukturierte Ergebnis der PROFILE-Phase.
 *
 * `generatedProfileSchema` ist das strikte Ausgabeformat des Opus-Calls
 * (Structured Output). `industryProfileSchema` ist die gespeicherte,
 * vom Nutzer editierbare Form (Nachbarbranchen mit Toggle-Zustand).
 */

export const seedAccountSchema = z.object({
  platform: z.enum(["tiktok", "instagram"]),
  handle: z.string().min(1),
});

export type SeedAccount = z.infer<typeof seedAccountSchema>;

/** Strikte Form für den LLM-Output (alle Felder erforderlich). */
export const generatedProfileSchema = z.object({
  keywords_de: z.array(z.string()),
  keywords_en: z.array(z.string()),
  synonyms: z.array(z.string()),
  hashtags: z.array(z.string()),
  seed_accounts: z.array(seedAccountSchema),
  adjacent_industries: z.array(z.string()),
  exclusions: z.array(z.string()),
  offer_forms: z.array(z.string()),
  region_default: z.string(),
});

export type GeneratedProfile = z.infer<typeof generatedProfileSchema>;

export const adjacentIndustrySchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
});

/** Gespeicherte, editierbare Form (industry_profiles.profile). */
export const industryProfileSchema = z.object({
  keywords_de: z.array(z.string()).default([]),
  keywords_en: z.array(z.string()).default([]),
  synonyms: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  seed_accounts: z.array(seedAccountSchema).default([]),
  adjacent_industries: z.array(adjacentIndustrySchema).default([]),
  exclusions: z.array(z.string()).default([]),
  offer_forms: z.array(z.string()).default([]),
  region_default: z.string().default("DE"),
});

export type IndustryProfile = z.infer<typeof industryProfileSchema>;

/** Hashtags ohne führendes #, klein, ohne Leerzeichen. */
export function normalizeHashtag(tag: string): string {
  return tag.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
}

/** LLM-Output → gespeicherte Form (Nachbarbranchen initial aktiviert). */
export function toStoredProfile(generated: GeneratedProfile): IndustryProfile {
  return industryProfileSchema.parse({
    ...generated,
    hashtags: generated.hashtags.map(normalizeHashtag).filter(Boolean),
    adjacent_industries: generated.adjacent_industries.map((name) => ({
      name,
      enabled: true,
    })),
  });
}
