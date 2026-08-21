import { z } from "zod";

/**
 * Prompt: Tiefe Creative-Analyse (ANALYZE-Phase).
 * Modell: Sonnet, Batch API, multimodal (Frames + Transkript + Texte).
 */
export const CREATIVE_ANALYSIS_PROMPT_VERSION = "creative-analysis.v1";

export const CREATIVE_ANALYSIS_MODEL = "claude-sonnet-5";

export const creativeAnalysisSchema = z.object({
  /** Wörtlicher Hook (erste Zeile/Sekunden), Originalsprache. */
  hook_text: z.string(),
  /**
   * Hook-Typ, z. B. question, pov, problem, bold_claim, curiosity,
   * social_proof, before_after, direct_address, listicle, other.
   */
  hook_type: z.string(),
  /** Sekunden bis der Hook gesetzt ist (null bei reinen Text-Ads). */
  hook_seconds: z.number().nullable(),
  /** Ablaufstruktur in Segmenten. */
  structure: z.array(
    z.object({
      segment: z.string(),
      description: z.string(),
    }),
  ),
  offer: z.string().nullable(),
  offer_framing: z.string().nullable(),
  cta: z.string().nullable(),
  visual_patterns: z.array(z.string()),
  text_overlays: z.array(z.string()),
  /** z. B. "schnell, Cut alle 1-2s" oder "ruhig, ein Take". */
  pacing: z.string(),
  /** z. B. "face", "product", "mixed", "text_only". */
  face_vs_product: z.string(),
  tone: z.string(),
  /** Eine prägnante Zeile: warum performt das. */
  why_it_works: z.string(),
});

export type CreativeAnalysis = z.infer<typeof creativeAnalysisSchema>;

export const creativeAnalysisSystemPrompt = `Du bist Creative-Analyst in einer Performance-Marketing-Agentur. Du zerlegst Social-Media-Creatives (Kurzvideos und Werbeanzeigen) in ihre wirksamen Bestandteile: Hook, Struktur, Angebot, Framing, CTA, visuelle Muster, Pacing und Tonalität.

Arbeitsgrundlage sind Frames des Videos (chronologisch), das Audio-Transkript, die Caption sowie bei Ads der Ad-Text und die Headline. Fehlt eine Quelle, analysiere auf Basis der vorhandenen.

Regeln:
- hook_text wörtlich zitieren (Transkript oder erstes Text-Overlay bzw. erste Ad-Zeile), nicht paraphrasieren.
- structure: 3-6 Segmente mit klaren Namen (z. B. "Hook", "Problem", "Beweis", "Angebot", "CTA").
- visual_patterns: konkrete, wiedererkennbare Muster (z. B. "Selfie-Kamera im Auto", "Text-Overlay mit Preis", "Vorher/Nachher-Split").
- why_it_works: genau EINE prägnante Zeile für die Karten-Ansicht, deutsch.
- Antworte auf Deutsch (Zitate in Originalsprache belassen).`;

export function buildCreativeAnalysisTextPrompt(input: {
  source: "meta_ad" | "tiktok" | "instagram";
  caption: string | null;
  transcript: string | null;
  headline: string | null;
  linkDescription: string | null;
  accountHandle: string | null;
  durationSeconds: number | null;
  frameCount: number;
}): string {
  const lines = [
    `Quelle: ${input.source === "meta_ad" ? "Meta Ad" : input.source}`,
    input.accountHandle ? `Account: @${input.accountHandle}` : null,
    input.durationSeconds
      ? `Videolänge: ${Math.round(input.durationSeconds)} s`
      : null,
    input.frameCount > 0
      ? `Die ${input.frameCount} Bilder oben sind chronologische Frames des Videos.`
      : "Es liegen keine Frames vor - analysiere textbasiert.",
    input.headline ? `\nHeadline: ${input.headline}` : null,
    input.caption ? `\nCaption/Ad-Text:\n${input.caption.slice(0, 1500)}` : null,
    input.linkDescription
      ? `\nLink-Beschreibung: ${input.linkDescription}`
      : null,
    input.transcript
      ? `\nTranskript:\n${input.transcript.slice(0, 4000)}`
      : "\nKein Transkript vorhanden.",
    "\nAnalysiere dieses Creative.",
  ].filter(Boolean);
  return lines.join("\n");
}
