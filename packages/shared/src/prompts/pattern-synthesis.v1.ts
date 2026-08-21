import { z } from "zod";
import type { CreativeAnalysis } from "./creative-analysis.v1";

/**
 * Prompt: Pattern-Synthese über alle analysierten Creatives
 * (SYNTHESIZE-Phase). Modell: Opus, Batch API (eine Anfrage pro Run).
 *
 * Creatives werden als Kurz-Referenzen (c1…cN) übergeben – der Worker
 * mappt die Referenzen zurück auf echte IDs. Das verhindert
 * halluzinierte UUIDs im Output.
 */
export const PATTERN_SYNTHESIS_PROMPT_VERSION = "pattern-synthesis.v1";

export const PATTERN_SYNTHESIS_MODEL = "claude-opus-5";

const patternClusterSchema = z.object({
  title: z.string(),
  description: z.string(),
  /** Anzahl Creatives im Pool, die dieses Muster zeigen. */
  frequency: z.number().int().min(1),
  /** Referenzen der 2–3 stärksten Beispiele (z. B. "c4"). */
  example_refs: z.array(z.string()).min(1).max(5),
  why_it_works: z.string(),
  /** Wie gut lässt sich das Muster auf andere Angebote übertragen? */
  transferability: z.string(),
});

export type PatternCluster = z.infer<typeof patternClusterSchema>;

export const patternReportSchema = z.object({
  /** 3–5 Sätze: die wichtigsten Erkenntnisse des Runs. */
  summary: z.string(),
  hooks: z.array(patternClusterSchema),
  structures: z.array(patternClusterSchema),
  offer_framings: z.array(patternClusterSchema),
  ctas: z.array(patternClusterSchema),
  visual_patterns: z.array(patternClusterSchema),
});

export type PatternReport = z.infer<typeof patternReportSchema>;

export const patternSynthesisSystemPrompt = `Du bist Head of Creative Strategy. Aus den Analysen der stärksten Creatives einer Branche leitest du wiederkehrende, umsetzbare Muster ab.

Du erhältst pro Creative eine Kurz-Analyse mit einer Referenz (c1, c2, …). Cluster die Muster über alle Creatives hinweg:

- hooks: wiederkehrende Hook-Typen und -Formulierungen
- structures: wiederkehrende Ablaufstrukturen
- offer_framings: wie Angebote gerahmt werden (Preis, Risiko-Umkehr, Dringlichkeit, …)
- ctas: wiederkehrende Call-to-Action-Muster
- visual_patterns: wiederkehrende visuelle Muster

Regeln:
- Nur Muster mit frequency >= 2 aufnehmen; frequency ist die tatsächliche Anzahl passender Creatives aus der Liste.
- example_refs: die 2-3 stärksten Beispiele je Muster, ausschließlich existierende Referenzen aus der Liste.
- Pro Sektion die 3-7 stärksten Cluster, sortiert nach frequency.
- description konkret und umsetzbar formulieren (was genau tun?), why_it_works erklärt den psychologischen Mechanismus, transferability sagt, für welche Angebotstypen das Muster funktioniert.
- Antworte auf Deutsch.`;

export interface SynthesisItem {
  ref: string;
  source: string;
  category: string;
  score: number;
  analysis: CreativeAnalysis;
}

export function buildSynthesisUserPrompt(items: SynthesisItem[]): string {
  const lines = items.map((item) => {
    const a = item.analysis;
    const structure = a.structure.map((s) => s.segment).join("→");
    return [
      `[${item.ref}]`,
      `${item.source} · ${item.category} · Score ${Math.round(item.score)}`,
      `Hook(${a.hook_type}): "${a.hook_text.slice(0, 120)}"`,
      structure ? `Struktur: ${structure}` : null,
      a.offer ? `Angebot: ${a.offer.slice(0, 80)}` : null,
      a.offer_framing ? `Framing: ${a.offer_framing.slice(0, 80)}` : null,
      a.cta ? `CTA: ${a.cta.slice(0, 60)}` : null,
      a.visual_patterns.length > 0
        ? `Visuell: ${a.visual_patterns.slice(0, 4).join(", ")}`
        : null,
      `Pacing: ${a.pacing.slice(0, 40)} · Ton: ${a.tone.slice(0, 40)}`,
      `Warum: ${a.why_it_works.slice(0, 120)}`,
    ]
      .filter(Boolean)
      .join(" | ");
  });

  return `Analysierte Creatives (${items.length}):\n\n${lines.join("\n")}\n\nLeite jetzt den Pattern-Report ab.`;
}
