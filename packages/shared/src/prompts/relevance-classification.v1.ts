import { z } from "zod";
import type { IndustryProfile } from "../profile";

/**
 * Prompt: Relevanz-Klassifikation pro Creative (FILTER-Phase).
 * Modell: Haiku, Batch API. Output strikt als Structured Output.
 */
export const RELEVANCE_PROMPT_VERSION = "relevance-classification.v1";

export const RELEVANCE_MODEL = "claude-haiku-4-5";

export const relevanceResultSchema = z.object({
  /** Relevanz 0–10 für die beschriebene Branche. */
  relevance: z.number().min(0).max(10),
  category: z.enum(["core", "adjacent", "foreign"]),
});

export type RelevanceResult = z.infer<typeof relevanceResultSchema>;

export function buildRelevanceSystemPrompt(profile: IndustryProfile): string {
  const adjacent = profile.adjacent_industries
    .filter((a) => a.enabled)
    .map((a) => a.name);
  return `Du klassifizierst Social-Media-Creatives (Werbeanzeigen und Kurzvideos) nach ihrer Relevanz für eine Zielbranche.

Zielbranche, beschrieben durch ihr Suchprofil:
- Keywords: ${[...profile.keywords_de, ...profile.keywords_en].join(", ") || "–"}
- Synonyme: ${profile.synonyms.join(", ") || "–"}
- Typische Angebotsformen: ${profile.offer_forms.join(", ") || "–"}
- Nachbarbranchen (zählen als "adjacent"): ${adjacent.join(", ") || "–"}
- Ausschlussbegriffe (deuten auf Irrelevanz): ${profile.exclusions.join(", ") || "–"}

Bewerte jedes Creative anhand von Caption, Ad-Text und Account-Beschreibung:
- relevance: 0 (völlig branchenfremd) bis 10 (eindeutig Kernbranche).
- category: "core" = Kernbranche, "adjacent" = Nachbarbranche aus der Liste
  oder inhaltlich eng verwandt, "foreign" = branchenfremd.
Sei streng: generischer Lifestyle-Content ohne Branchenbezug ist "foreign"
mit niedriger relevance, auch wenn einzelne Keywords zufällig vorkommen.`;
}

export function buildRelevanceUserPrompt(input: {
  source: string;
  caption: string | null;
  headline: string | null;
  accountBio: string | null;
  accountHandle: string | null;
}): string {
  const lines = [
    `Quelle: ${input.source}`,
    input.caption ? `Caption/Text: ${input.caption.slice(0, 800)}` : null,
    input.headline ? `Headline: ${input.headline}` : null,
    input.accountHandle ? `Account: @${input.accountHandle}` : null,
    input.accountBio ? `Account-Bio: ${input.accountBio.slice(0, 300)}` : null,
  ].filter(Boolean);
  return `Klassifiziere dieses Creative:\n\n${lines.join("\n")}`;
}
