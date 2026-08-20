/**
 * Design-Tokens – die eine Quelle der Wahrheit für alle Gestaltungswerte.
 * Die CSS-Seite (globals.css, @theme) bildet exakt dieselben Werte ab;
 * dieses Modul existiert für Stellen, die Werte in JS brauchen (Charts,
 * Canvas, dynamische Styles).
 *
 * Stil: warm, ruhig, editorial. Eine Akzentfarbe. Keine Schatten,
 * keine Borders – Flächen trennen sich über Tonwerte.
 */
export const tokens = {
  color: {
    /** Warmes Off-White – der Seitenhintergrund. */
    canvas: "#F4F4F2",
    /** Karten: reines Weiß, trennt sich nur über den Tonunterschied. */
    surface: "#FFFFFF",
    /** Sekundäre Flächen (Inputs, Wells, Skeletons). */
    surface2: "#EDEDEB",
    /** Text primär + schwarze Pill-Buttons + Logo. */
    ink: "#111111",
    /** Text sekundär. */
    ink2: "#6B6B6B",
    /** Text tertiär – nur dekorativ/disabled, nie für Inhalte. */
    ink3: "#A3A3A3",
    /** Die eine Akzentfarbe: Koralle. Primäraktionen, Scores, Charts. */
    accent: "#E8634A",
    accentHover: "#D4573F",
  },
  radius: {
    /** Karten. */
    card: 24,
    /** Große Container, Dialoge. */
    container: 32,
    /** Thumbnails (9:16-Creatives). */
    thumb: 16,
    /** Buttons, Chips, Inputs: vollständig rund. */
    pill: 9999,
  },
  size: {
    /** Kreisrunde Icon-Buttons. */
    iconButton: 48,
  },
  typography: {
    /** Eine Grotesk für alles: Geist. */
    family: "Geist",
    h1: { min: 40, max: 56, lineHeight: 1.1 },
    kpi: { min: 32, max: 40, weight: 500 },
    label: { size: 13 },
  },
  chart: {
    /** Koralle auf Hellgrau, dünne Linien, keine Gitternetze. */
    line: "#E8634A",
    track: "#EDEDEB",
    strokeWidth: 2,
  },
  easing: {
    outQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
    outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;
