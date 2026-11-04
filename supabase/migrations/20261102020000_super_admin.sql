-- Super admins: emails that are always an active owner, whatever happens on the team page.
-- Run after 20261102000000_dashboard_auth.sql.
--
-- Add or remove one with:
--   insert into public.dashboard_super_admins (email) values ('someone@example.com');
--   delete from public.dashboard_super_admins where email = 'someone@example.com';

create table if not exists public.dashboard_super_admins (
  email citext primary key,
  created_at timestamptz not null default now()
);

-- No policies: the app can't read or change this list, only SQL / the Supabase dashboard can.
alter table public.dashboard_super_admins enable row level security;

insert into public.dashboard_super_admins (email)
values ('asadwaqas.dev@gmail.com')
on conflict (email) do nothing;

-- Role changes need an owner, except when claim_dashboard_access() promotes a
-- super admin; and nobody can demote or deactivate a super admin from the app.
create or replace function app.prevent_role_escalation()
returns trigger
language plpgsql
as $$
declare
  v_bypass boolean := coalesce(current_setting('app.bypass_role_check', true), '') = 'on';
begin
  if v_bypass then
    return new;
  end if;

  if exists (select 1 from public.dashboard_super_admins s where s.email = old.email)
     and (new.role is distinct from 'owner' or not new.is_active) then
    raise exception 'This account is a super admin and must stay an active owner';
  end if;

  if new.role is distinct from old.role then
    if not app.is_admin() then
      raise exception 'Only an owner can change a user role';
    end if;
  end if;
  return new;
end;
$$;

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
  v_super boolean;
begin
  if v_uid is null then
    return null;
  end if;

  select * into v_user from auth.users where id = v_uid;
  v_super := v_user.email is not null
    and v_user.email_confirmed_at is not null
    and exists (select 1 from public.dashboard_super_admins where email = v_user.email::citext);

  select * into v_profile from public.profiles where id = v_uid;
  if found then
    if v_super and (v_profile.role <> 'owner' or not v_profile.is_active) then
      perform set_config('app.bypass_role_check', 'on', true);
      update public.profiles set role = 'owner', is_active = true, last_seen_at = now() where id = v_uid;
      return 'owner';
    end if;
    update public.profiles set last_seen_at = now() where id = v_uid;
    return case when v_profile.is_active then v_profile.role end;
  end if;

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

  if not v_super then
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
  end if;

  -- Super admins always get in; otherwise only the very first person on a fresh database.
  if v_super or not exists (select 1 from public.profiles) then
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
    update public.user_invites set accepted_at = now(), accepted_by = v_uid
    where email = v_user.email::citext and accepted_at is null;
    return 'owner';
  end if;

  return null;
end;
$$;

revoke all on function public.claim_dashboard_access() from public, anon;
grant execute on function public.claim_dashboard_access() to authenticated;
