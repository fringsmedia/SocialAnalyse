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
    settings: "Einstellungen",
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
  runStatusLabels: {
    draft: "Entwurf",
    queued: "Wartet",
    collecting: "Sammeln",
    filtering: "Filtern",
    scoring: "Bewerten",
    analyzing: "Analysieren",
    synthesizing: "Muster ableiten",
    completed: "Abgeschlossen",
    failed: "Fehlgeschlagen",
    cancelled: "Abgebrochen",
  } as Record<string, string>,
  clientDetail: {
    back: "Alle Kunden",
    newAnalysis: "Analyse anlegen",
    runsTitle: "Analysen",
    runsCount: (n: number) => (n === 1 ? "1 Analyse" : `${n} Analysen`),
    emptyTitle: "Noch keine Analyse",
    emptyText:
      "Beschreibe die Branche in ein bis zwei Sätzen – den Rest übernimmt die Pipeline.",
    startFirst: "Erste Analyse anlegen",
    openRun: "Öffnen",
    startedAt: (date: string) => `Gestartet am ${date}`,
  },
  newAnalysis: {
    title: "Branche beschreiben",
    subtitle:
      "Ein bis zwei Sätze genügen – daraus entsteht das Suchprofil mit Keywords, Hashtags und Seed-Accounts, das du im nächsten Schritt prüfst.",
    label: "Branche und Angebot",
    placeholder:
      "z. B. Familiengeführtes Autohaus in Bayern, Fokus auf Gebrauchtwagen und Finanzierung für junge Familien",
    submit: "Profil generieren",
    errors: {
      tooShort: "Bitte beschreibe die Branche mit mindestens 15 Zeichen.",
      generic: "Das Profil konnte nicht angelegt werden.",
    },
  },
  wizard: {
    steps: ["Beschreiben", "Profil prüfen", "Starten"],
    generatingTitle: "Dein Branchenprofil entsteht",
    generatingText:
      "Keywords, Hashtags, Seed-Accounts und Ausschlüsse werden aus deiner Beschreibung abgeleitet. Das dauert meist unter einer Minute.",
    failedTitle: "Generierung fehlgeschlagen",
    failedText:
      "Das Profil konnte nicht erstellt werden. Versuche es erneut – deine Beschreibung bleibt erhalten.",
    retry: "Erneut generieren",
    sourceLabel: "Deine Beschreibung",
    sections: {
      keywordsDe: "Keywords (Deutsch)",
      keywordsEn: "Keywords (Englisch)",
      synonyms: "Synonyme",
      hashtags: "Hashtags",
      seedAccounts: "Seed-Accounts",
      adjacent: "Nachbarbranchen",
      exclusions: "Ausschlussbegriffe",
      offerForms: "Angebotsformen",
    },
    adjacentHint:
      "Aktivierte Nachbarbranchen fließen mit ~20 % in den Analyse-Pool ein.",
    seedAccountsHint:
      "Nur echte Accounts – sie dienen als Startpunkte für die Sammlung.",
    addPlaceholder: "Hinzufügen und Enter",
    handlePlaceholder: "handle",
    add: "Hinzufügen",
    continue: "Weiter zur Konfiguration",
    back: "Zurück zum Profil",
    configTitle: "Umfang festlegen",
    region: "Region",
    platforms: "Plattformen",
    platformLabels: {
      meta_ad: "Meta Ads",
      tiktok: "TikTok",
      instagram: "Instagram Reels",
    } as Record<string, string>,
    depth: "Analyse-Tiefe (Top-N)",
    depthOption: (n: number) => `Top ${n}`,
    collectTarget: "Sammelziel",
    estimateTitle: "Geschätzte Kosten",
    estimateHint:
      "Konservative Schätzung für KI-Analyse, Sammlung und Transkription. Die echten Kosten siehst du live am Run.",
    estimatePerPart: {
      collect: "Sammlung (Apify)",
      filter: "Relevanz-Filter",
      analyze: "Tiefe Analyse",
      synthesize: "Pattern-Report",
      transcription: "Transkription",
    },
    start: "Analyse starten",
    starting: "Wird gestartet …",
    errors: {
      platformsRequired: "Wähle mindestens eine Plattform.",
      generic: "Der Start hat nicht geklappt. Bitte versuche es erneut.",
    },
  },
  run: {
    eyebrow: "Analyse",
    phases: {
      profile: "Profil",
      collect: "Sammeln",
      filter: "Filtern",
      score: "Bewerten",
      analyze: "Analysieren",
      synthesize: "Muster",
      generate: "Generieren",
    },
    generateOnDemand: "auf Anfrage",
    counts: {
      collected: (n: string) => `${n} gesammelt`,
      relevant: (n: string) => `${n} relevant`,
      analyzed: (n: string) => `${n} analysiert`,
    },
    remaining: (min: number) => `≈ ${min} Min. verbleibend`,
    completedText: "Analyse abgeschlossen.",
    failedText: "Die Analyse ist fehlgeschlagen.",
    cancelledText: "Die Analyse wurde abgebrochen.",
    queuedText: "Wartet auf den Worker …",
    cancel: "Abbrechen",
    retry: "Erneut versuchen",
    errorsTitle: "Protokoll",
  },
  cost: {
    title: "Kosten dieses Runs",
    total: "Gesamt",
    entries: {
      haiku: "Haiku · Relevanz-Filter",
      sonnet: "Sonnet · Tiefe Analyse",
      opus: "Opus · Synthese",
      whisper: "Whisper · Transkription",
      apify: "Apify · Sammlung",
    },
    tokens: (input: string, output: string) => `${input} in · ${output} out`,
    events: (n: string) => `${n} Events`,
    seconds: (s: string) => `${s} s Audio`,
    empty: "Für diesen Run wurden noch keine Kosten erfasst.",
  },
  limits: {
    runs: "Limit erreicht: Es laufen bereits mehrere Analysen. Warte, bis eine abgeschlossen ist.",
    generations:
      "Limit erreicht: Es laufen bereits Generierungen. Warte einen Moment.",
  },
  settings: {
    eyebrow: "Organisation",
    title: "Einstellungen.",
    membersTitle: "Mitglieder",
    roleLabels: {
      owner: "Owner",
      admin: "Admin",
      member: "Mitglied",
    } as Record<string, string>,
    invitesTitle: "Einladungen",
    inviteHint:
      "Die Einladung gilt für genau diese E-Mail-Adresse. Der Versand läuft per E-Mail; den Link kannst du zusätzlich kopieren.",
    inviteEmail: "E-Mail",
    inviteEmailPlaceholder: "kollegin@agentur.de",
    inviteRole: "Rolle",
    inviteSubmit: "Einladen",
    invitePending: "Ausstehend",
    inviteLinkCopy: "Link kopieren",
    inviteCopied: "Kopiert",
    inviteRevoke: "Zurückziehen",
    inviteEmailSent: "Einladung per E-Mail versendet.",
    inviteEmailFailed:
      "E-Mail-Versand nicht möglich – teile den kopierten Link manuell.",
    planTitle: "Plan",
    planHint:
      "Abrechnung folgt (Stripe-Struktur vorbereitet) – aktuell frei nutzbar.",
    onlyAdmins: "Nur Admins verwalten Einladungen.",
    errors: {
      invalidEmail: "Bitte gib eine gültige E-Mail-Adresse an.",
      generic: "Das hat nicht geklappt. Bitte versuche es erneut.",
    },
  },
  invite: {
    title: "Einladung annehmen",
    loggedInText:
      "Du wurdest in eine Organisation eingeladen. Mit dem Beitritt siehst du deren Kunden und Analysen.",
    loggedOutText:
      "Melde dich mit der eingeladenen E-Mail-Adresse an oder erstelle ein Konto, um beizutreten.",
    accept: "Beitreten",
    toLogin: "Anmelden",
    toRegister: "Konto erstellen",
    errors: {
      invalid: "Diese Einladung ist ungültig oder wurde bereits verwendet.",
      emailMismatch: "Die Einladung gilt für eine andere E-Mail-Adresse.",
    },
  },
  results: {
    tabs: {
      ads: "Top-Ads",
      videos: "Top-Videos",
      report: "Pattern-Report",
    },
    sort: {
      label: "Sortierung",
      score: "Score",
      outlier: "Outlier-Faktor",
      recent: "Neueste",
      longevity: "Laufzeit",
    },
    filterCategory: {
      all: "Alle",
      core: "Kernbranche",
      adjacent: "Nachbarbranche",
      foreign: "Branchenfremd",
    } as Record<string, string>,
    outlierBadge: (factor: string) => `${factor}× über Account-Schnitt`,
    runtimeDays: (days: number) => `${days} Tage aktiv`,
    views: (n: string) => `${n} Views`,
    engagement: (pct: string) => `ER ${pct}`,
    reach: (n: string) => `${n} Reichweite (EU)`,
    openOriginal: "Original öffnen",
    itemsCount: (n: number) => (n === 1 ? "1 Creative" : `${n} Creatives`),
    emptyVideos: "Keine relevanten Videos in diesem Run.",
    emptyAds: "Keine relevanten Ads in diesem Run.",
    categoryLabels: {
      core: "Kern",
      adjacent: "Nachbar",
      foreign: "Fremd",
    } as Record<string, string>,
  },
  generator: {
    eyebrow: "Creative-Generator",
    title: "Neue Creatives.",
    context:
      "Links dein Angebot, rechts fertige Hooks, Skript-Strukturen und Ad-Texte – jeder Vorschlag mit Pattern und Original-Beleg.",
    basedOnRun: (date: string) => `Basis: Analyse vom ${date}`,
    form: {
      offer: "Dein Angebot",
      offerPlaceholder:
        "z. B. Gebrauchtwagen mit 12 Monaten Garantie und 0%-Finanzierung für junge Familien",
      audience: "Zielgruppe",
      audiencePlaceholder: "z. B. Familien in Bayern, 28–45, preisbewusst",
      tone: "Tonalität",
      tonePlaceholder: "z. B. locker, direkt, ohne Werbesprech",
      platform: "Plattform",
      platformAll: "Alle (Mix)",
      submit: "Creatives generieren",
      generating: "Wird generiert …",
      generatingHint:
        "Opus leitet aus den Patterns deine Bausteine ab – meist unter zwei Minuten.",
      errors: {
        invalid: "Bitte fülle Angebot, Zielgruppe und Tonalität aus.",
        generic: "Die Generierung konnte nicht gestartet werden.",
      },
    },
    needRun: {
      title: "Noch keine Basis",
      text: "Der Generator braucht eine abgeschlossene Analyse mit Pattern-Report. Starte zuerst eine Analyse für diesen Kunden.",
      cta: "Analyse anlegen",
    },
    sections: {
      hook: "Hooks",
      script_structure: "Skript-Strukturen",
      ad_text: "Ad-Texte",
      offer_variant: "Angebotsvarianten",
    } as Record<string, string>,
    copy: "Kopieren",
    copied: "Kopiert",
    exportMd: "Als Markdown exportieren",
    failed: "Die Generierung ist fehlgeschlagen. Versuche es erneut.",
    empty:
      "Definiere links dein Angebot – rechts erscheinen die generierten Bausteine.",
    openGenerator: "Creative-Generator",
  },
  report: {
    summaryTitle: "Zusammenfassung",
    sections: {
      hook: "Hooks",
      structure: "Strukturen",
      offer_framing: "Angebotsframings",
      cta: "CTAs",
      visual: "Visuelle Muster",
    } as Record<string, string>,
    frequency: (n: number) => (n === 1 ? "1 Creative" : `${n} Creatives`),
    whyItWorks: "Warum es funktioniert",
    transferability: "Übertragbarkeit",
    empty: "Für diesen Run liegt noch kein Pattern-Report vor.",
  },
  drawer: {
    whyTitle: "Warum performt das",
    frames: "Frames",
    transcript: "Transkript",
    hook: "Hook",
    structure: "Struktur",
    offer: "Angebot",
    offerFraming: "Framing",
    cta: "CTA",
    visualPatterns: "Visuelle Muster",
    textOverlays: "Text-Overlays",
    pacing: "Pacing",
    faceVsProduct: "Fokus",
    tone: "Tonalität",
    headline: "Headline",
    adText: "Ad-Text",
    noAnalysis:
      "Für dieses Creative liegt keine tiefe Analyse vor – es war nicht im Top-N-Pool.",
    openOriginal: "Original öffnen",
    feedbackQuestion: "Passt dieses Creative zur Branche?",
    feedbackFits: "Passt",
    feedbackFitsNot: "Passt nicht",
    feedbackHint: "Dein Feedback schärft das Profil beim nächsten Run.",
  },
} as const;

export type Messages = typeof de;

/** Aktive Sprache. Bei weiteren Sprachen: Auflösung über Nutzer-Setting. */
export function getMessages(): Messages {
  return de;
}
