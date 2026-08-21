-- ============================================================
-- Phase 1: Status-Maschine für Branchenprofile
--   generating  → Opus-Job läuft (Worker)
--   draft       → generiert, Nutzer prüft/editiert
--   confirmed   → bestätigt, Run gestartet (eingefroren)
--   failed      → Generierung endgültig fehlgeschlagen
-- ============================================================

alter table public.industry_profiles
  drop constraint industry_profiles_status_check;

alter table public.industry_profiles
  add constraint industry_profiles_status_check
  check (status in ('generating', 'draft', 'confirmed', 'failed'));

alter table public.industry_profiles
  alter column status set default 'generating';
