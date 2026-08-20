-- ============================================================
-- Row Level Security – Mandantentrennung
--
-- Prinzip:
--   * Lesen: jedes Org-Mitglied sieht ausschließlich Daten der
--     eigenen Organisation(en).
--   * Schreiben durch Nutzer: nur dort, wo die UI es braucht
--     (clients, profiles, runs, generations, feedback, jobs).
--   * Pipeline-Ergebnisse (creatives, analyses, patterns, reports,
--     accounts) schreibt ausschließlich der Worker (Service Role,
--     umgeht RLS) – Nutzer haben nur Lesezugriff.
-- ============================================================

-- ---------- Helper (security definer bricht die RLS-Rekursion
-- auf organization_members auf) ----------

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.organization_members
     where organization_id = p_org_id
       and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.organization_members
     where organization_id = p_org_id
       and user_id = auth.uid()
       and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.organization_members
     where organization_id = p_org_id
       and user_id = auth.uid()
       and role = 'owner'
  );
$$;

-- Organisation anlegen: Insert in organizations + owner-Mitgliedschaft
-- atomar, an RLS vorbei (Henne-Ei: ohne Mitgliedschaft keine Insert-Policy).
create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if length(trim(p_name)) < 2 then
    raise exception 'invalid_name';
  end if;

  insert into public.organizations (name, slug)
  values (trim(p_name), p_slug)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');

  return v_org;
end;
$$;

revoke execute on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

-- ---------- RLS aktivieren ----------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.clients enable row level security;
alter table public.industry_profiles enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.accounts enable row level security;
alter table public.creatives enable row level security;
alter table public.creative_analyses enable row level security;
alter table public.patterns enable row level security;
alter table public.pattern_reports enable row level security;
alter table public.generations enable row level security;
alter table public.generation_items enable row level security;
alter table public.feedback enable row level security;
alter table public.job_queue enable row level security;

-- ---------- organizations ----------

create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create policy organizations_delete on public.organizations
  for delete to authenticated
  using (public.is_org_owner(id));

-- Insert nur über create_organization() (security definer).

-- ---------- organization_members ----------

create policy organization_members_select on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check (public.is_org_admin(organization_id));

create policy organization_members_update on public.organization_members
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Admins entfernen Mitglieder; jedes Mitglied darf selbst austreten.
create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (public.is_org_admin(organization_id) or user_id = auth.uid());

-- ---------- organization_invites (enthalten E-Mails → admin-only) ----------

create policy organization_invites_all on public.organization_invites
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- ---------- clients ----------

create policy clients_select on public.clients
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy clients_update on public.clients
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_org_admin(organization_id));

-- ---------- industry_profiles ----------

create policy industry_profiles_select on public.industry_profiles
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy industry_profiles_insert on public.industry_profiles
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy industry_profiles_update on public.industry_profiles
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------- analysis_runs (Nutzer: anlegen, bestätigen, abbrechen) ----------

create policy analysis_runs_select on public.analysis_runs
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy analysis_runs_insert on public.analysis_runs
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy analysis_runs_update on public.analysis_runs
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy analysis_runs_delete on public.analysis_runs
  for delete to authenticated
  using (public.is_org_admin(organization_id));

-- ---------- Pipeline-Ergebnisse: nur lesen (Worker schreibt via Service Role) ----------

create policy accounts_select on public.accounts
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy creatives_select on public.creatives
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy creative_analyses_select on public.creative_analyses
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy patterns_select on public.patterns
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy pattern_reports_select on public.pattern_reports
  for select to authenticated
  using (public.is_org_member(organization_id));

-- ---------- generations ----------

create policy generations_select on public.generations
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy generations_insert on public.generations
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy generation_items_select on public.generation_items
  for select to authenticated
  using (public.is_org_member(organization_id));

-- ---------- feedback (jeder schreibt nur eigenes Feedback) ----------

create policy feedback_select on public.feedback
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy feedback_insert on public.feedback
  for insert to authenticated
  with check (public.is_org_member(organization_id) and user_id = auth.uid());

create policy feedback_update on public.feedback
  for update to authenticated
  using (user_id = auth.uid())
  with check (public.is_org_member(organization_id) and user_id = auth.uid());

create policy feedback_delete on public.feedback
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------- job_queue (Nutzer: einreihen + Status lesen; Rest Worker) ----------

create policy job_queue_select on public.job_queue
  for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));

create policy job_queue_insert on public.job_queue
  for insert to authenticated
  with check (organization_id is not null and public.is_org_member(organization_id));
