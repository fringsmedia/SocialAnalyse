-- ============================================================
-- Creative Intelligence – Kernschema
-- Alle mandantenbezogenen Tabellen tragen organization_id.
-- RLS-Policies folgen in 20260820100002_rls.sql.
-- ============================================================

-- ---------- Enums ----------

create type member_role as enum ('owner', 'admin', 'member');

create type run_status as enum (
  'draft',        -- Profil noch nicht bestätigt
  'queued',       -- bestätigt, wartet auf Worker
  'collecting',
  'filtering',
  'scoring',
  'analyzing',
  'synthesizing',
  'completed',
  'failed',
  'cancelled'
);

create type creative_source as enum ('meta_ad', 'tiktok', 'instagram');

create type creative_category as enum ('core', 'adjacent', 'foreign');

create type pattern_type as enum (
  'hook',
  'structure',
  'offer_framing',
  'cta',
  'visual'
);

create type feedback_verdict as enum ('fits', 'does_not_fit');

create type job_status as enum ('pending', 'running', 'succeeded', 'failed');

-- ---------- updated_at-Trigger ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Multi-Tenant-Basis ----------

create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            member_role not null default 'member',
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);

create table public.organization_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  role            member_role not null default 'member',
  token           uuid not null unique default gen_random_uuid(),
  invited_by      uuid references auth.users(id) on delete set null,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index organization_invites_org_idx on public.organization_invites (organization_id);

-- ---------- Kunden & Branchenprofile ----------

create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index clients_org_idx on public.clients (organization_id);

create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- Versioniertes Branchenprofil. profile-JSONB enthält Keywords DE/EN,
-- Synonyme, Hashtags, Seed-Accounts, Nachbarbranchen, Ausschlussbegriffe,
-- typische Angebotsformen (Schema wird in packages/shared per zod validiert).
create table public.industry_profiles (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  client_id          uuid not null references public.clients(id) on delete cascade,
  version            int not null default 1,
  status             text not null default 'draft' check (status in ('draft', 'confirmed')),
  source_description text not null,
  profile            jsonb not null default '{}'::jsonb,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (client_id, version)
);

create index industry_profiles_client_idx on public.industry_profiles (client_id);

create trigger industry_profiles_touch before update on public.industry_profiles
  for each row execute function public.touch_updated_at();

-- ---------- Analysis-Runs ----------

-- config: Region, Plattformen, Top-N, Schwellen, Gewichte
-- phase_counts: { collected, relevant, scored, analyzed, patterns }
-- cost_breakdown: { anthropic: {haiku|sonnet|opus: {inputTokens, outputTokens, usd}},
--                   openai: {whisperSeconds, usd}, apify: {events, usd} }
-- error_log: Array von { at, phase, message, detail }
create table public.analysis_runs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  profile_id      uuid not null references public.industry_profiles(id) on delete restrict,
  status          run_status not null default 'draft',
  config          jsonb not null default '{}'::jsonb,
  phase_counts    jsonb not null default '{}'::jsonb,
  cost_breakdown  jsonb not null default '{}'::jsonb,
  error_log       jsonb not null default '[]'::jsonb,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index analysis_runs_org_idx on public.analysis_runs (organization_id);
create index analysis_runs_client_idx on public.analysis_runs (client_id, created_at desc);

create trigger analysis_runs_touch before update on public.analysis_runs
  for each row execute function public.touch_updated_at();

-- Live-Fortschritt in der UI via Supabase Realtime
alter publication supabase_realtime add table public.analysis_runs;

-- ---------- Accounts (Cache für Outlier-Score) ----------

create table public.accounts (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  platform          creative_source not null,
  external_id       text not null,
  handle            text,
  display_name      text,
  bio               text,
  follower_count    bigint,
  median_views      numeric,
  metrics           jsonb not null default '{}'::jsonb,
  last_refreshed_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (organization_id, platform, external_id)
);

create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();

-- ---------- Creatives ----------

create table public.creatives (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id          uuid not null references public.analysis_runs(id) on delete cascade,
  source          creative_source not null,
  external_id     text not null,
  url             text not null,
  platforms       text[] not null default '{}',
  account_id      uuid references public.accounts(id) on delete set null,
  caption         text,
  thumbnail_path  text,
  published_at    timestamptz,
  raw_metrics     jsonb not null default '{}'::jsonb,
  relevance_score numeric,
  category        creative_category,
  performance_score numeric,
  score_breakdown jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (run_id, source, external_id)
);

create index creatives_run_idx on public.creatives (run_id);
create index creatives_run_score_idx on public.creatives (run_id, performance_score desc nulls last);
create index creatives_account_idx on public.creatives (account_id);

create trigger creatives_touch before update on public.creatives
  for each row execute function public.touch_updated_at();

-- ---------- Tiefe Analyse ----------

-- analysis-JSONB: { hook_text, hook_type, hook_seconds, structure[], offer,
--   offer_framing, cta, visual_patterns[], text_overlays[], pacing,
--   face_vs_product, tone, why_it_works } – bei Ads zusätzlich ad_text, headline
create table public.creative_analyses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creative_id     uuid not null unique references public.creatives(id) on delete cascade,
  transcript      text,
  frame_paths     text[] not null default '{}',
  analysis        jsonb not null default '{}'::jsonb,
  model           text not null,
  input_tokens    int not null default 0,
  output_tokens   int not null default 0,
  created_at      timestamptz not null default now()
);

-- ---------- Patterns & Reports ----------

create table public.patterns (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  run_id               uuid not null references public.analysis_runs(id) on delete cascade,
  type                 pattern_type not null,
  title                text not null,
  description          text not null,
  frequency            int not null default 0,
  example_creative_ids uuid[] not null default '{}',
  data                 jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

create index patterns_run_idx on public.patterns (run_id);

create table public.pattern_reports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id          uuid not null unique references public.analysis_runs(id) on delete cascade,
  report          jsonb not null default '{}'::jsonb,
  model           text not null,
  input_tokens    int not null default 0,
  output_tokens   int not null default 0,
  created_at      timestamptz not null default now()
);

-- ---------- Generator ----------

-- input: { offer, audience, tone, platform }
create table public.generations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  run_id          uuid references public.analysis_runs(id) on delete set null,
  input           jsonb not null default '{}'::jsonb,
  model           text,
  input_tokens    int not null default 0,
  output_tokens   int not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending', 'running', 'succeeded', 'failed')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index generations_client_idx on public.generations (client_id, created_at desc);

create trigger generations_touch before update on public.generations
  for each row execute function public.touch_updated_at();

-- Jedes generierte Item referenziert sein Pattern und 1–2 Quell-Creatives.
create table public.generation_items (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  generation_id       uuid not null references public.generations(id) on delete cascade,
  kind                text not null
                      check (kind in ('hook', 'script_structure', 'ad_text', 'offer_variant')),
  content             jsonb not null default '{}'::jsonb,
  pattern_id          uuid references public.patterns(id) on delete set null,
  source_creative_ids uuid[] not null default '{}',
  position            int not null default 0,
  created_at          timestamptz not null default now()
);

create index generation_items_generation_idx on public.generation_items (generation_id);

-- ---------- Feedback ----------

create table public.feedback (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creative_id     uuid not null references public.creatives(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  verdict         feedback_verdict not null,
  note            text,
  created_at      timestamptz not null default now(),
  unique (creative_id, user_id)
);

create index feedback_creative_idx on public.feedback (creative_id);
