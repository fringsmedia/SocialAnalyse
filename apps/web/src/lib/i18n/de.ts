/**
 * UI-Texte, Deutsch (Standard-Sprache).
 *
 * i18n-Ansatz: ein typisierter Katalog pro Sprache. Weitere Sprachen
 * ergänzen eine Datei mit identischer Struktur (satisfies Messages)
 * und werden über `getMessages(locale)` aufgelöst – ohne Framework-
 * Overhead, aber mit Compile-Zeit-Sicherheit gegen fehlende Keys.
 */
export const de = {
  common: {
    cancel: "Abbrechen",
    save: "Speichern",
    create: "Anlegen",
    loading: "Einen Moment …",
    signOut: "Abmelden",
    requiredHint: "Pflichtfeld",
  },
  auth: {
    loginTitle: "Anmelden",
    loginSubtitle: "Willkommen zurück.",
    registerTitle: "Konto erstellen",
    registerSubtitle: "Starte mit deiner ersten Branchenanalyse.",
    email: "E-Mail",
    emailPlaceholder: "name@agentur.de",
    password: "Passwort",
    passwordPlaceholder: "Mindestens 8 Zeichen",
    submitLogin: "Anmelden",
    submitRegister: "Konto erstellen",
    noAccount: "Noch kein Konto?",
    toRegister: "Registrieren",
    hasAccount: "Bereits ein Konto?",
    toLogin: "Zur Anmeldung",
    confirmEmailSent:
      "Fast geschafft – bitte bestätige deine E-Mail-Adresse über den Link in deinem Postfach.",
    errors: {
      invalidCredentials: "E-Mail oder Passwort ist nicht korrekt.",
      emailInUse: "Für diese E-Mail existiert bereits ein Konto.",
      weakPassword: "Das Passwort muss mindestens 8 Zeichen lang sein.",
      generic: "Das hat nicht geklappt. Bitte versuche es erneut.",
    },
  },
  onboarding: {
    title: "Deine Organisation",
    subtitle:
      "Der gemeinsame Raum für dein Team – Kunden, Analysen und Ergebnisse gehören zur Organisation.",
    orgName: "Name der Organisation",
    orgNamePlaceholder: "z. B. Frings Media",
    submit: "Organisation anlegen",
    errors: {
      nameTooShort: "Der Name braucht mindestens 2 Zeichen.",
      generic: "Die Organisation konnte nicht angelegt werden.",
    },
  },
  home: {
    eyebrow: "Übersicht",
    greeting: "Deine Kunden.",
    context:
      "Lege Kunden an und starte für jeden eine Branchenanalyse – die stärksten Ads und Videos, Patterns und fertige Creatives.",
    clientsCount: (n: number) => (n === 1 ? "1 Kunde" : `${n} Kunden`),
    newClient: "Neuer Kunde",
    emptyTitle: "Noch keine Kunden",
    emptyText:
      "Lege deinen ersten Kunden an, um eine Branchenanalyse zu starten.",
    emptyCta: "Ersten Kunden anlegen",
    noRunYet: "Noch keine Analyse",
    createdAt: (date: string) => `Angelegt am ${date}`,
  },
  clientDialog: {
    title: "Neuen Kunden anlegen",
    name: "Name",
    namePlaceholder: "z. B. Autohaus Huber",
    description: "Beschreibung",
    descriptionPlaceholder:
      "Kurz: Was bietet der Kunde an, für wen? (optional)",
    errors: {
      nameTooShort: "Der Name braucht mindestens 2 Zeichen.",
      generic: "Der Kunde konnte nicht angelegt werden.",
    },
  },
} as const;

export type Messages = typeof de;

/** Aktive Sprache. Bei weiteren Sprachen: Auflösung über Nutzer-Setting. */
export function getMessages(): Messages {
  return de;
}
