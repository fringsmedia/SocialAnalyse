/**
 * Stripe-Vorbereitung: Plan-Struktur und Limits (keine Zahlungslogik).
 * Die Limits werden serverseitig beim Start von Runs/Generierungen
 * geprüft; Stripe-Webhooks schreiben später subscriptions.plan.
 */
export const PLANS = {
  free: {
    label: "Free",
    maxClients: 1,
    maxRunsPerMonth: 2,
  },
  starter: {
    label: "Starter",
    maxClients: 3,
    maxRunsPerMonth: 10,
  },
  pro: {
    label: "Pro",
    maxClients: 10,
    maxRunsPerMonth: 40,
  },
  agency: {
    label: "Agency",
    maxClients: 50,
    maxRunsPerMonth: 200,
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Harte Betriebs-Limits, unabhängig vom Plan. */
export const RATE_LIMITS = {
  /** Parallel laufende Analysen pro Organisation. */
  maxActiveRuns: 3,
  /** Parallel laufende Generierungen pro Organisation. */
  maxActiveGenerations: 2,
} as const;
