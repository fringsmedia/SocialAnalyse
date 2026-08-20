-- ============================================================
-- Worker-Queue mit Locking (FOR UPDATE SKIP LOCKED),
-- Retries und exponentiellem Backoff.
-- Der Worker greift ausschließlich mit dem Service-Role-Key zu;
-- die Claim-/Complete-/Fail-Funktionen sind für anon/authenticated gesperrt.
-- ============================================================

create table public.job_queue (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  run_id          uuid references public.analysis_runs(id) on delete cascade,
  job_type        text not null,
  payload         jsonb not null default '{}'::jsonb,
  status          job_status not null default 'pending',
  priority        int not null default 0,
  attempts        int not null default 0,
  max_attempts    int not null default 3,
  run_after       timestamptz not null default now(),
  locked_by       text,
  locked_at       timestamptz,
  last_error      text,
  result          jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index job_queue_claim_idx
  on public.job_queue (status, run_after, priority desc, created_at);
create index job_queue_run_idx on public.job_queue (run_id);

create trigger job_queue_touch before update on public.job_queue
  for each row execute function public.touch_updated_at();

-- Nächsten fälligen Job atomar claimen. Konkurrierende Worker
-- überspringen gesperrte Zeilen (SKIP LOCKED) – kein Doppel-Claim.
create or replace function public.claim_next_job(
  p_worker_id text,
  p_job_types text[] default null
)
returns setof public.job_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.job_queue;
begin
  select *
    into v_job
    from public.job_queue
   where status = 'pending'
     and run_after <= now()
     and (p_job_types is null or job_type = any (p_job_types))
   order by priority desc, created_at
   for update skip locked
   limit 1;

  if v_job.id is null then
    return;
  end if;

  update public.job_queue
     set status = 'running',
         attempts = attempts + 1,
         locked_by = p_worker_id,
         locked_at = now()
   where id = v_job.id
   returning * into v_job;

  return next v_job;
end;
$$;

create or replace function public.complete_job(
  p_job_id uuid,
  p_result jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.job_queue
     set status = 'succeeded',
         result = coalesce(p_result, result),
         locked_by = null,
         locked_at = null
   where id = p_job_id;
$$;

-- Fehlschlag: unterhalb von max_attempts zurück auf 'pending' mit
-- exponentiellem Backoff (30s * 2^attempts), sonst terminal 'failed'.
create or replace function public.fail_job(
  p_job_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.job_queue;
begin
  select * into v_job from public.job_queue where id = p_job_id for update;
  if v_job.id is null then
    return;
  end if;

  if v_job.attempts >= v_job.max_attempts then
    update public.job_queue
       set status = 'failed',
           last_error = p_error,
           locked_by = null,
           locked_at = null
     where id = p_job_id;
  else
    update public.job_queue
       set status = 'pending',
           last_error = p_error,
           locked_by = null,
           locked_at = null,
           run_after = now() + (interval '30 seconds' * power(2, v_job.attempts))
     where id = p_job_id;
  end if;
end;
$$;

-- Queue-Funktionen sind Worker-exklusiv (Service Role).
revoke execute on function public.claim_next_job(text, text[]) from public, anon, authenticated;
revoke execute on function public.complete_job(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_job(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_next_job(text, text[]) to service_role;
grant execute on function public.complete_job(uuid, jsonb) to service_role;
grant execute on function public.fail_job(uuid, text) to service_role;
