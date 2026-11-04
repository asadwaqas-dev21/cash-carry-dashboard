-- Dashboard sign-in and role-based access.
-- Run after cashcarry_sql_schema.sql (Supabase SQL editor, or `supabase db push`).
--
-- How access works:
--   * Anyone can create a Supabase Auth account (Google, email link, password),
--     but only accounts with an active row in public.profiles can use the dashboard.
--   * The owner invites an email with a role (public.user_invites). The first time
--     that email signs in, claim_dashboard_access() turns the invite into a profile.
--   * The very first account to sign in on a fresh database becomes the owner.
--   * Turning a profile off (is_active = false) cuts off its data access through RLS.

-- Email on profiles, so the team page can show who is who.
alter table public.profiles add column if not exists email citext;

-- Deactivated profiles no longer resolve to an org, so every org-scoped RLS policy denies them.
create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create or replace function app.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

-- Members can always read their own profile (even when deactivated), so the app
-- can tell "no access yet" apart from "signed out".
drop policy if exists "users can read their own profile" on public.profiles;
create policy "users can read their own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create table if not exists public.user_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  role public.user_role not null default 'sales_person',
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

alter table public.user_invites enable row level security;

drop policy if exists "owners manage invites" on public.user_invites;
create policy "owners manage invites"
on public.user_invites for all to authenticated
using (org_id = app.current_org_id() and app.is_admin())
with check (org_id = app.current_org_id() and app.is_admin());

-- Called by the app right after every sign-in. Returns the caller's role, or
-- null when they have no access (yet).
create or replace function public.claim_dashboard_access()
returns public.user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users%rowtype;
  v_name text;
  v_avatar text;
  v_profile public.profiles%rowtype;
  v_invite public.user_invites%rowtype;
  v_org uuid;
begin
  if v_uid is null then
    return null;
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if found then
    update public.profiles set last_seen_at = now() where id = v_uid;
    return case when v_profile.is_active then v_profile.role end;
  end if;

  select * into v_user from auth.users where id = v_uid;
  -- Invites are only honoured for verified addresses (Google, email links and
  -- confirmed password sign-ups all verify the email).
  if v_user.email is null or v_user.email_confirmed_at is null then
    return null;
  end if;

  v_name := coalesce(
    nullif(v_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(v_user.raw_user_meta_data ->> 'name', ''),
    split_part(v_user.email, '@', 1)
  );
  v_avatar := coalesce(v_user.raw_user_meta_data ->> 'avatar_url', v_user.raw_user_meta_data ->> 'picture');

  -- Serialise claims so two first sign-ins can't both become the bootstrap owner.
  perform pg_advisory_xact_lock(hashtext('claim_dashboard_access'));

  select * into v_invite
  from public.user_invites
  where email = v_user.email::citext and accepted_at is null
  order by created_at desc
  limit 1;

  if found then
    insert into public.profiles (id, org_id, full_name, avatar_url, email, role, last_seen_at)
    values (v_uid, v_invite.org_id, v_name, v_avatar, v_user.email, v_invite.role, now());
    update public.user_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;
    return v_invite.role;
  end if;

  -- Fresh database: the first person to sign in becomes the owner.
  if not exists (select 1 from public.profiles) then
    select id into v_org from public.organizations order by created_at limit 1;
    if v_org is null then
      insert into public.organizations (name, slug, currency_code, timezone)
      values ('Kirana Cash & Carry', 'kirana-cash-carry', 'PKR', 'Asia/Karachi')
      returning id into v_org;
    end if;

    if not exists (select 1 from public.locations where org_id = v_org) then
      insert into public.locations (org_id, name, code, type, country)
      values (v_org, 'Main Location', 'MAIN', 'warehouse', 'Pakistan');
    end if;

    insert into public.profiles (id, org_id, full_name, avatar_url, email, role, last_seen_at)
    values (v_uid, v_org, v_name, v_avatar, v_user.email, 'owner', now());
    return 'owner';
  end if;

  return null;
end;
$$;

revoke all on function public.claim_dashboard_access() from public, anon;
grant execute on function public.claim_dashboard_access() to authenticated;
