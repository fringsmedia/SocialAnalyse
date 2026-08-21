-- ============================================================
-- Phase 6: SaaS-Reife
--   * subscriptions – Stripe-Vorbereitung (nur Struktur, keine
--     Zahlungslogik; Webhooks schreiben später via Service Role)
--   * accept_invite – Einladung per Token annehmen
--   * org_members_with_email – Mitgliederliste inkl. E-Mail
-- ============================================================

-- ---------- Subscriptions (Struktur) ----------

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free'
                         check (plan in ('free', 'starter', 'pro', 'agency')),
  status                 text not null default 'inactive'
                         check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

alter table public.subscriptions enable row level security;

-- Mitglieder sehen den Plan; geschrieben wird nur via Service Role
-- (spätere Stripe-Webhooks).
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.is_org_member(organization_id));

-- ---------- Einladung annehmen ----------

create or replace function public.accept_invite(p_token uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.organization_invites;
  v_email text;
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite
    from public.organization_invites
   where token = p_token
     and accepted_at is null;
  if v_invite.id is null then
    raise exception 'invite_invalid';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email <> lower(v_invite.email) then
    raise exception 'email_mismatch';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invite.organization_id, auth.uid(), v_invite.role)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invites
     set accepted_at = now()
   where id = v_invite.id;

  select * into v_org
    from public.organizations
   where id = v_invite.organization_id;
  return v_org;
end;
$$;

revoke execute on function public.accept_invite(uuid) from public, anon;
grant execute on function public.accept_invite(uuid) to authenticated;

-- ---------- Mitgliederliste inkl. E-Mail ----------

create or replace function public.org_members_with_email(p_org_id uuid)
returns table (
  user_id uuid,
  email text,
  role member_role,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, u.email::text, m.role, m.created_at
    from public.organization_members m
    join auth.users u on u.id = m.user_id
   where m.organization_id = p_org_id
     and public.is_org_member(p_org_id);
$$;

revoke execute on function public.org_members_with_email(uuid) from public, anon;
grant execute on function public.org_members_with_email(uuid) to authenticated;
