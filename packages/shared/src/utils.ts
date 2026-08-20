/**
 * URL-taugliche Slugs, u. a. für Organisationen.
 * Behandelt deutsche Umlaute korrekt (Müller → mueller).
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Zahlendarstellung für Metriken, de-DE: unter 1 Mio. voll mit
 * Tausenderpunkt ("1.842"), darüber kompakt ("1,2 Mio.").
 * (CLDR-Compact kürzt deutsche Tausender nicht und verliert dabei
 * die Gruppierung – deshalb die explizite Schwelle.)
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) < 1_000_000) {
    return new Intl.NumberFormat("de-DE").format(value);
  }
  return new Intl.NumberFormat("de-DE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Exponentielles Backoff mit Deckel.
 * attempt 1 → base, attempt 2 → base*2, attempt 3 → base*4, …
 */
export function backoffMs(
  attempt: number,
  baseMs = 1000,
  maxMs = 60_000,
): number {
  if (attempt < 1) return baseMs;
  return Math.min(baseMs * 2 ** (attempt - 1), maxMs);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Führt fn aus und wiederholt bei Fehlern mit exponentiellem Backoff.
 * Wird ab Phase 1 von allen externen API-Adaptern genutzt.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number; maxMs?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(backoffMs(attempt, opts.baseMs, opts.maxMs));
      }
    }
  }
  throw lastError;
}
