# Creative Intelligence

Multi-Tenant-SaaS für Agenturen und Unternehmen: Der Nutzer beschreibt eine
Branche, das Tool sammelt die aktuell stärksten Werbeanzeigen (Meta Ad
Library) und organischen Kurzvideos (TikTok, Instagram Reels), bewertet und
analysiert sie (Hooks, Struktur, Angebotsframing, visuelle Muster), leitet
wiederkehrende Patterns ab und generiert daraus fertige Hooks,
Skript-Strukturen und Ad-Texte – jeweils mit Verweis auf Pattern und
Original-Creative.

> Der Produktname ist ein Arbeitstitel und zentral als Konstante gepflegt:
> `PRODUCT_NAME` in `packages/shared/src/constants.ts`.

## Repo-Struktur (Monorepo, pnpm-Workspaces)

```
apps/
  web/        Next.js (App Router) – UI, Auth, Realtime-Status
  worker/     Node/TS-Service – langlaufende Jobs (ffmpeg, Whisper, KI),
              kommuniziert ausschließlich über Supabase (job_queue + Realtime)
packages/
  db/         Supabase: Migrationen, RLS, DB-Typen, Seed
  shared/     Konstanten, Domain-Typen, Env-Validierung, Utils
              (ab Phase 1: adapters/ für externe APIs, prompts/ versioniert)
```

## Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4,
  Radix-Primitives mit vollständig eigenem visuellem System
- **Backend/DB:** Supabase (Postgres, Auth, Storage, Realtime, RLS für
  Mandantentrennung)
- **Worker:** Node 22 + tsx, Queue in Postgres (`job_queue` mit
  `FOR UPDATE SKIP LOCKED`, Retries, exponentielles Backoff)
- **KI (ab Phase 1):** Anthropic API – Haiku (Massen-Klassifikation),
  Sonnet (Frame-Analyse), Opus (Synthese, Generierung); Batch API für alle
  nicht-interaktiven Schritte
- **Transkription (ab Phase 3):** OpenAI Whisper API. Entscheidung gegen
  lokales whisper.cpp: Bei ~80 Videos à ~30 s pro Run kostet die API rund
  0,25 € pro Run – dafür entfallen GPU-/CPU-Provisionierung, Modell-Updates
  und Betrieb. Die Adapter-Schicht hält whisper.cpp als späteren Drop-in
  offen, falls das Volumen die Rechnung dreht.
- **Video-Verarbeitung (ab Phase 3):** ffmpeg im Worker; Videos werden
  gestreamt, Frames/Audio extrahiert, Original sofort verworfen. Gespeichert
  werden nur WebP-Thumbnails/Frames in Supabase Storage.

## Setup (lokal)

Voraussetzungen: Node ≥ 22, [pnpm](https://pnpm.io) ≥ 10,
[Supabase CLI](https://supabase.com/docs/guides/cli), Docker (für die lokale
Supabase).

```bash
# 1. Abhängigkeiten
pnpm install

# 2. Lokale Supabase starten (führt alle Migrationen aus)
cd packages/db
supabase start          # gibt URL, anon key und service_role key aus

# 3. Env-Dateien anlegen
cp .env.example apps/web/.env.local     # Werte aus `supabase status` eintragen
cp .env.example apps/worker/.env

# 4. Demo-Daten (Nutzer, Organisation, Kunde) einspielen
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
pnpm db:seed
# → Login: demo@example.com / demo-password-123

# 5. App starten
pnpm dev                # Web-App auf http://localhost:3000

# 6. Worker starten (separates Terminal)
cd apps/worker
pnpm dev                # pollt die job_queue
```

Nützliche Kommandos:

```bash
pnpm typecheck          # TypeScript über alle Pakete
pnpm test               # Unit-Tests (vitest)
pnpm build              # Produktions-Build
pnpm db:types           # DB-Typen aus lokaler Supabase regenerieren
```

## Architektur der Pipeline

Jede Analyse ist ein `analysis_run` mit Status-Maschine
(`draft → queued → collecting → filtering → scoring → analyzing →
synthesizing → completed`, plus `failed`/`cancelled`). Jeder Schritt
schreibt Fortschritts-Zähler nach `analysis_runs.phase_counts` und seinen
Verbrauch nach `analysis_runs.cost_breakdown`; die UI zeigt beides live über
Supabase Realtime.

| Phase | Schritt | Modell/Dienst |
| --- | --- | --- |
| 1 | PROFILE – Branchenprofil generieren, Nutzer bestätigt | Opus |
| 2 | COLLECT – 1.000–2.000 Items (Meta Ad Library, Apify) | – |
| 3 | FILTER – semantische Relevanz 0–10, Schwelle 6 | Haiku (Batch) |
| 4 | SCORE – Outlier/Engagement/Velocity bzw. Laufzeit/Varianten | – |
| 5 | ANALYZE – Top-N: Whisper + Frames + strukturiertes JSON | Sonnet |
| 6 | SYNTHESIZE – Pattern-Report mit Clustern und Beispielen | Opus |
| 7 | GENERATE – Hooks, Skripte, Ad-Texte mit Referenzen | Opus |

## Datenmodell

Alle mandantenbezogenen Tabellen tragen `organization_id` und sind per RLS
isoliert (`packages/db/supabase/migrations/`):

- `organizations`, `organization_members`, `organization_invites`
- `clients` – Kunde/Brand einer Organisation
- `industry_profiles` – versioniertes Branchenprofil (JSONB)
- `analysis_runs` – Status, Zähler, Kosten, Fehlerlog
- `accounts` – gecachte Account-Metadaten inkl. `median_views`
- `creatives` – ein Datensatz pro Ad/Video inkl. Scores und Kategorie
- `creative_analyses` – Transkript, Frames, Analyse-JSON
- `patterns`, `pattern_reports` – Synthese-Ergebnisse
- `generations`, `generation_items` – Generator-Anfragen und -Ergebnisse
  (jedes Item mit `pattern_id` + `source_creative_ids`)
- `feedback` – passt/passt nicht, fließt in den nächsten Run
- `job_queue` – Worker-Queue (Locking, Retries, Backoff)

Schreibrechte: Nutzer schreiben nur, was die UI braucht (Kunden, Profile,
Runs, Generator-Anfragen, Feedback, Jobs). Alle Pipeline-Ergebnisse schreibt
ausschließlich der Worker über den Service-Role-Key.

Storage: privater Bucket `creatives`
(`{organization_id}/{run_id}/{creative_id}/…`), Lesezugriff nur für
Org-Mitglieder, Schreibzugriff nur für den Worker. Es werden keine Videos
gespeichert.

## Design-System

Warm, ruhig, editorial: Off-White-Canvas `#F4F4F2`, weiße Karten ohne
Schatten und Borders, genau eine Akzentfarbe Koralle `#E8634A`, Geist als
einzige Schrift, Pill-Buttons, 9:16-Thumbnails als Held. Tokens:
`apps/web/src/lib/design-tokens.ts` (JS) + `apps/web/src/app/globals.css`
(Tailwind-`@theme`). Styleguide mit allen Komponenten: **`/design`**.

## Deployment

- **Web:** Vercel (Root `apps/web`). Keine Vercel-Function läuft länger als
  10 s – alles Langlaufende geht über die `job_queue` an den Worker.
- **Worker:** Railway oder Fly.io (`apps/worker`, Start: `pnpm start`).
  Braucht `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- **DB:** Supabase-Cloud-Projekt; Migrationen via
  `supabase db push` (aus `packages/db`).

## Phasenstatus

- [x] **Phase 0 – Setup:** Monorepo, Migrationen + RLS, Auth (Login,
      Registrierung, Organisation), Worker-Queue-Grundgerüst, Design-Tokens,
      `/design`-Styleguide, Seed, Tests
- [x] **Phase 1 – Profil und Collect:** dreistufiger Anlage-Flow
      (Beschreiben → Profil prüfen mit editierbaren Chips/Toggles →
      Konfiguration mit Kostenschätzung), Profil-Generierung via Opus
      (Structured Output, Worker-Job), Meta-Ad-Library-Adapter,
      Apify-Adapter für TikTok und Instagram, Collect-Handler mit
      Fortschritts- und Kosten-Tracking, Run-Status-Screen mit
      Supabase Realtime + Abbruch
- [ ] Phase 2 – Filter und Score
- [ ] Phase 3 – Analyze
- [ ] Phase 4 – Synthesize
- [ ] Phase 5 – Generate
- [ ] Phase 6 – SaaS-Reife

Hinweis zu Phase 0: Die Einladung per E-Mail ist im Datenmodell angelegt
(`organization_invites`), UI und Versand folgen im Onboarding-Teil von
Phase 6.

Hinweise zu Phase 1:

- Die offizielle Meta Ad Library API liefert keine Bild-URLs – Ads tragen
  in Phase 1 kein Thumbnail, sondern verlinken den Original-Snapshot.
  Organische Creatives führen ihre Remote-Thumbnail-URL in
  `raw_metrics.thumbnail_url`; die WebP-Ingestion nach Supabase Storage
  passiert gezielt für die angezeigten Top-Items (Phase 2/3), nicht für
  alle 1.000–2.000 gesammelten Items.
- Solange die Filter-Phase (Phase 2) nicht existiert, schließt der
  Collect-Handler den Run nach dem Sammeln ab; sobald ein
  `filter`-Handler registriert ist, reiht er ihn automatisch ein.
