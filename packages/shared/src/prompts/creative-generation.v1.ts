import { z } from "zod";

/**
 * Prompt: Creative-Generierung (GENERATE-Phase, auf Nutzer-Anfrage).
 * Modell: Opus, direkter Call (interaktiv – der Nutzer wartet).
 *
 * Patterns gehen als p1…pN, Quell-Creatives als c1…cM in den Prompt;
 * der Worker mappt die Referenzen auf echte IDs zurück. Jeder Vorschlag
 * referenziert sein Pattern und 1–2 Quell-Creatives.
 */
export const CREATIVE_GENERATION_PROMPT_VERSION = "creative-generation.v1";

export const CREATIVE_GENERATION_MODEL = "claude-opus-5";

const refsSchema = {
  /** Referenz des zugrunde liegenden Patterns (z. B. "p3"). */
  pattern_ref: z.string(),
  /** 1–2 Quell-Creatives, aus denen abgeleitet wurde (z. B. "c7"). */
  source_refs: z.array(z.string()).min(1).max(2),
};

export const generationResultSchema = z.object({
  hooks: z
    .array(
      z.object({
        text: z.string(),
        ...refsSchema,
      }),
    )
    .length(15),
  script_structures: z
    .array(
      z.object({
        title: z.string(),
        outline: z.array(
          z.object({ segment: z.string(), description: z.string() }),
        ),
        ...refsSchema,
      }),
    )
    .length(5),
  ad_texts: z
    .array(
      z.object({
        headline: z.string(),
        body: z.string(),
        cta: z.string(),
        ...refsSchema,
      }),
    )
    .length(5),
  offer_variants: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        ...refsSchema,
      }),
    )
    .length(3),
});

export type GenerationResult = z.infer<typeof generationResultSchema>;

export const generationInputSchema = z.object({
  offer: z.string().trim().min(10).max(1000),
  audience: z.string().trim().min(3).max(500),
  tone: z.string().trim().min(3).max(200),
  platform: z.enum(["tiktok", "instagram", "meta_ad", "all"]),
});

export type GenerationInput = z.infer<typeof generationInputSchema>;

export const creativeGenerationSystemPrompt = `Du bist Senior-Creative-Stratege. Aus belegten Mustern einer Branchenanalyse erstellst du einsatzfertige Creative-Bausteine für das konkrete Angebot des Nutzers.

Du erhältst:
1. Patterns (p1, p2, …) mit Beschreibung und Wirkmechanismus.
2. Quell-Creatives (c1, c2, …) mit Hook und Kernaussage – die Belege der Patterns.
3. Das Angebot, die Zielgruppe, die Tonalität und die Ziel-Plattform des Nutzers.

Erstelle exakt:
- 15 Hooks (erste 1-2 Sätze bzw. erste 3 Sekunden, wortfertig)
- 5 Skript-Strukturen (Titel + Segmente mit konkreter Beschreibung fürs Angebot)
- 5 Ad-Texte (Headline + Body + CTA, plattformgerecht)
- 3 Angebotsvarianten (wie das Angebot geframt werden kann)

Regeln:
- Jeder Vorschlag referenziert GENAU EIN Pattern (pattern_ref) und 1-2 Quell-Creatives (source_refs), von denen er abgeleitet ist. Nur existierende Referenzen verwenden.
- Wortfertig und konkret fürs Angebot – keine Platzhalter wie "[Produkt]".
- Sprache: Deutsch, in der gewünschten Tonalität. Für TikTok/Reels gesprochene Sprache, für Meta Ads präziser Werbetext.
- Variiere über verschiedene Patterns hinweg, statt ein Muster 15-mal zu wiederholen.`;

export interface GenerationPatternInput {
  ref: string;
  type: string;
  title: string;
  description: string;
  whyItWorks: string | null;
}

export interface GenerationSourceInput {
  ref: string;
  source: string;
  hookText: string | null;
  whyItWorks: string | null;
}

export function buildGenerationUserPrompt(input: {
  patterns: GenerationPatternInput[];
  sources: GenerationSourceInput[];
  request: GenerationInput;
}): string {
  const patternLines = input.patterns.map(
    (p) =>
      `[${p.ref}] (${p.type}) ${p.title}: ${p.description.slice(0, 200)}${
        p.whyItWorks ? ` | Wirkung: ${p.whyItWorks.slice(0, 120)}` : ""
      }`,
  );
  const sourceLines = input.sources.map(
    (s) =>
      `[${s.ref}] ${s.source}${s.hookText ? ` | Hook: "${s.hookText.slice(0, 100)}"` : ""}${
        s.whyItWorks ? ` | ${s.whyItWorks.slice(0, 100)}` : ""
      }`,
  );
  const platformLabel =
    input.request.platform === "all"
      ? "Alle Plattformen (Mix)"
      : input.request.platform;

  return `Patterns:
${patternLines.join("\n")}

Quell-Creatives:
${sourceLines.join("\n")}

Auftrag des Nutzers:
- Angebot: ${input.request.offer}
- Zielgruppe: ${input.request.audience}
- Tonalität: ${input.request.tone}
- Plattform: ${platformLabel}

Erstelle jetzt die Creative-Bausteine.`;
}
