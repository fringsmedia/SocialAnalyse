/**
 * Prompt: Branchenprofil-Generierung (PROFILE-Phase).
 * Modell: Opus. Output strikt als Structured Output
 * (generatedProfileSchema in ../profile.ts).
 *
 * Versionierung: Änderungen an Formulierung oder Feldern ergeben eine
 * neue Datei (v2, …) – bestehende Runs bleiben nachvollziehbar.
 */
export const INDUSTRY_PROFILE_PROMPT_VERSION = "industry-profile.v1";

export const INDUSTRY_PROFILE_MODEL = "claude-opus-5";

export const industryProfileSystemPrompt = `Du bist Senior-Stratege in einer Performance-Marketing-Agentur mit tiefem Wissen über Social-Media-Werbung (Meta Ads, TikTok, Instagram Reels) in allen Branchen, von lokalen Dienstleistern bis B2B-SaaS.

Aus einer kurzen Branchenbeschreibung erstellst du ein präzises Suchprofil, mit dem Werbeanzeigen und organische Kurzvideos dieser Branche gefunden werden. Das Profil steuert eine automatisierte Sammlung: Zu breite Begriffe fluten die Ergebnisse mit Irrelevantem, zu enge verpassen die stärksten Creatives.

Regeln:
- keywords_de: 8-15 deutsche Suchbegriffe, wie sie in Anzeigen und Captions der Branche tatsächlich vorkommen (Angebots- und Problembegriffe, keine Fachjargon-Exoten).
- keywords_en: 5-10 englische Äquivalente, relevant für internationale Creatives derselben Branche.
- synonyms: Umgangssprachliche Varianten und regionale Begriffe.
- hashtags: 8-15 Hashtags ohne #-Zeichen, wie sie auf TikTok/Instagram für diese Branche genutzt werden (Mix aus großen und Nischen-Hashtags).
- seed_accounts: Nur real existierende, dir sicher bekannte Accounts der Branche (TikTok/Instagram). Im Zweifel weglassen - eine leere Liste ist besser als erfundene Handles.
- adjacent_industries: 3-6 Nachbarbranchen, deren Creative-Muster übertragbar sind.
- exclusions: Begriffe, die zu Verwechslungen führen (andere Bedeutung, andere Branche) und ausgefiltert werden sollen.
- offer_forms: Typische Angebotsformen der Branche (z. B. Probefahrt, Erstgespräch, Rabattaktion, Demo).
- region_default: Wahrscheinlichste Zielregion als Ländercode (DE, AT, CH, EU, US, GB) aus der Beschreibung.

Antworte ausschließlich mit dem geforderten strukturierten Ergebnis.`;

export interface ProfileFeedbackContext {
  /** Captions von Creatives, die Nutzer als "passt" markiert haben. */
  fits: string[];
  /** Captions von Creatives, die Nutzer als "passt nicht" markiert haben. */
  fitsNot: string[];
}

export function buildIndustryProfileUserPrompt(input: {
  clientName: string;
  description: string;
  /** Feedback aus früheren Runs (Phase 6, optionaler Kontext). */
  feedback?: ProfileFeedbackContext;
}): string {
  const sections = [
    `Kunde: ${input.clientName}`,
    `Branchenbeschreibung des Nutzers:\n"""\n${input.description}\n"""`,
  ];

  const fits = input.feedback?.fits ?? [];
  const fitsNot = input.feedback?.fitsNot ?? [];
  if (fits.length > 0 || fitsNot.length > 0) {
    const lines = [
      "Feedback aus früheren Analysen dieses Kunden (nutze es, um Keywords und Ausschlussbegriffe zu schärfen):",
    ];
    if (fits.length > 0) {
      lines.push(
        `Als PASSEND markierte Creatives:\n${fits
          .map((c) => `- "${c.slice(0, 150)}"`)
          .join("\n")}`,
      );
    }
    if (fitsNot.length > 0) {
      lines.push(
        `Als NICHT PASSEND markierte Creatives (solche Inhalte künftig ausschließen):\n${fitsNot
          .map((c) => `- "${c.slice(0, 150)}"`)
          .join("\n")}`,
      );
    }
    sections.push(lines.join("\n\n"));
  }

  sections.push("Erstelle das Suchprofil für diese Branche.");
  return sections.join("\n\n");
}
