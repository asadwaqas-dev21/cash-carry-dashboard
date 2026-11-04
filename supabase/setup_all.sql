-- One-shot setup: every migration in supabase/migrations, in order, plus the admin email.
-- Paste this whole file into the Supabase SQL Editor (project skteprqmpqmyzkrodspq) and click Run.
-- Safe to run more than once. Needs cashcarry_sql_schema.sql to have been run first.

-- ================================================================
-- 20261102000000_dashboard_auth.sql
-- ================================================================
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


-- ================================================================
-- 20261102010000_settings_storage.sql
-- ================================================================
-- Settings page: profile photos and keeping profile emails in sync.
-- Run after 20261102000000_dashboard_auth.sql.

-- The original schema creates the 'kirana-public' bucket but its upload policy
-- checked 'cash-carry-public', so no upload could ever succeed.
drop policy if exists "authenticated users can upload cash & carry public files" on storage.objects;
create policy "authenticated users can upload cash & carry public files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'kirana-public');

-- Avatars live under avatars/<user id>/; only that user may add, replace or delete them.
drop policy if exists "users manage their own avatar files" on storage.objects;
create policy "users manage their own avatar files"
on storage.objects
for all
to authenticated
using (bucket_id = 'kirana-public' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text)
with check (bucket_id = 'kirana-public' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);

-- After someone confirms an email change, copy the new address to their profile on next sign-in.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_sync_profile_email on auth.users;
create trigger tr_sync_profile_email
  after update of email on auth.users
  for each row execute function public.sync_profile_email();


-- ================================================================
-- 20261102020000_super_admin.sql
-- ================================================================
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


-- ================================================================
-- 20261102030000_rider_app.sql
-- ================================================================
-- Rider app (rider_app/ Flutter project).
-- Run after 20261102000000_dashboard_auth.sql.
--
-- Riders are not dashboard users, so the app never touches tables directly.
-- It calls the rider_* functions below, which only ever act on the signed-in
-- rider's own deliveries. To give a rider access, set their email on the
-- riders row (dashboard or SQL); the first time they sign in with that
-- (verified) email, their account is linked to the rider.

alter table public.riders add column if not exists email citext;
alter table public.riders add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists riders_auth_user_key on public.riders(auth_user_id) where auth_user_id is not null;
create unique index if not exists riders_org_email_key on public.riders(org_id, email) where email is not null;

-- The active rider linked to the caller, linking by verified email on first use.
create or replace function app.current_rider_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_email text;
  v_confirmed timestamptz;
begin
  if v_uid is null then
    return null;
  end if;

  select id into v_id from public.riders where auth_user_id = v_uid and is_active;
  if v_id is not null then
    return v_id;
  end if;

  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  if v_email is null or v_confirmed is null then
    return null;
  end if;

  update public.riders
  set auth_user_id = v_uid
  where id = (
    select id from public.riders
    where email = v_email::citext and auth_user_id is null and is_active
    order by created_at
    limit 1
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rider_me()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := app.current_rider_id();
  v_result json;
begin
  if v_id is null then
    return null;
  end if;

  select json_build_object(
    'id', r.id,
    'full_name', r.full_name,
    'rider_code', r.rider_code,
    'phone', r.phone,
    'vehicle', nullif(concat_ws(' · ', r.vehicle_type, r.vehicle_number), ''),
    'status', r.status,
    'cash_on_hand', r.cash_on_hand,
    'store_name', o.name,
    'delivered_today', (
      select count(*) from public.deliveries d
      where d.rider_id = r.id and d.status = 'delivered' and d.delivered_at >= date_trunc('day', now())
    )
  )
  into v_result
  from public.riders r
  join public.organizations o on o.id = r.org_id
  where r.id = v_id;

  return v_result;
end;
$$;

create or replace function public.rider_set_status(p_status public.rider_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := app.current_rider_id();
begin
  if v_id is null then
    raise exception 'This account is not linked to a rider';
  end if;
  if p_status not in ('available', 'on_break', 'off_shift') then
    raise exception 'Riders can only go online, take a break or go offline';
  end if;
  update public.riders set status = p_status, updated_at = now() where id = v_id;
end;
$$;

-- Active deliveries first, then today's finished ones.
create or replace function public.rider_deliveries()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := app.current_rider_id();
  v_result json;
begin
  if v_id is null then
    return '[]'::json;
  end if;

  select coalesce(json_agg(x order by x.sort_key, x.assigned_at), '[]'::json)
  into v_result
  from (
    select
      d.id,
      d.status,
      d.assigned_at,
      d.picked_up_at,
      d.delivered_at,
      d.failed_at,
      d.cash_to_collect,
      d.cash_collected,
      d.failure_reason,
      coalesce(d.notes, o.notes) as notes,
      o.order_number,
      o.grand_total,
      coalesce(a.recipient_name, c.display_name) as customer_name,
      coalesce(a.phone, c.phone) as customer_phone,
      a.address_line1,
      a.address_line2,
      a.city,
      a.latitude,
      a.longitude,
      a.delivery_notes,
      (
        select coalesce(json_agg(json_build_object('name', oi.product_name, 'quantity', oi.quantity)), '[]'::json)
        from public.order_items oi where oi.order_id = o.id
      ) as items,
      case when d.status in ('assigned', 'picked_up', 'out_for_delivery') then 0 else 1 end as sort_key
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    left join public.customer_addresses a on a.id = coalesce(d.dropoff_address_id, o.customer_address_id)
    left join public.customers c on c.id = o.customer_id
    where d.rider_id = v_id
      and (
        d.status in ('assigned', 'picked_up', 'out_for_delivery')
        or coalesce(d.delivered_at, d.failed_at, d.updated_at) >= date_trunc('day', now())
      )
  ) x;

  return v_result;
end;
$$;

-- p_action: 'pick_up' | 'deliver' (with p_cash) | 'fail' (with p_reason)
create or replace function public.rider_update_delivery(
  p_delivery_id uuid,
  p_action text,
  p_cash numeric default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := app.current_rider_id();
  v_delivery public.deliveries%rowtype;
  v_order public.orders%rowtype;
begin
  if v_id is null then
    raise exception 'This account is not linked to a rider';
  end if;

  select * into v_delivery from public.deliveries
  where id = p_delivery_id and rider_id = v_id
  for update;
  if not found then
    raise exception 'Delivery not found';
  end if;

  if p_action = 'pick_up' then
    if v_delivery.status <> 'assigned' then
      raise exception 'This delivery is already %', replace(v_delivery.status::text, '_', ' ');
    end if;
    update public.deliveries set status = 'out_for_delivery', picked_up_at = now(), updated_at = now() where id = v_delivery.id;
    update public.orders set status = 'out_for_delivery', delivery_status = 'out_for_delivery', updated_at = now() where id = v_delivery.order_id;
    update public.riders set status = 'on_delivery', updated_at = now() where id = v_id;

  elsif p_action = 'deliver' then
    if v_delivery.status not in ('picked_up', 'out_for_delivery') then
      raise exception 'Pick up the order before marking it delivered';
    end if;
    if p_cash is null or p_cash < 0 then
      raise exception 'Enter the cash you collected (0 if none)';
    end if;

    update public.deliveries
    set status = 'delivered', delivered_at = now(), cash_collected = p_cash, updated_at = now()
    where id = v_delivery.id;

    select * into v_order from public.orders where id = v_delivery.order_id for update;
    update public.orders
    set status = 'delivered',
        delivery_status = 'delivered',
        delivered_at = now(),
        paid_total = paid_total + p_cash,
        payment_status = case
          when paid_total + p_cash >= grand_total then 'paid'::public.payment_status
          when paid_total + p_cash > 0 then 'partially_paid'::public.payment_status
          else payment_status
        end,
        updated_at = now()
    where id = v_order.id;

    if p_cash > 0 then
      insert into public.rider_cash_collections (org_id, rider_id, delivery_id, order_id, amount)
      values (v_delivery.org_id, v_id, v_delivery.id, v_order.id, p_cash);

      insert into public.payments (org_id, order_id, customer_id, payment_number, method, amount, cash_received, currency_code)
      values (v_delivery.org_id, v_order.id, v_order.customer_id, 'COD-' || v_order.order_number, 'cash', p_cash, p_cash, v_order.currency_code)
      on conflict (org_id, payment_number) do nothing;

      update public.riders set cash_on_hand = cash_on_hand + p_cash where id = v_id;
    end if;

  elsif p_action = 'fail' then
    if v_delivery.status in ('delivered', 'failed', 'cancelled', 'returned') then
      raise exception 'This delivery is already %', v_delivery.status;
    end if;
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'Choose a reason';
    end if;
    update public.deliveries set status = 'failed', failed_at = now(), failure_reason = trim(p_reason), updated_at = now() where id = v_delivery.id;
    update public.orders set delivery_status = 'failed', updated_at = now() where id = v_delivery.order_id;

  else
    raise exception 'Unknown action %', p_action;
  end if;

  -- Back to available once nothing is in hand.
  update public.riders
  set status = 'available', updated_at = now()
  where id = v_id
    and status = 'on_delivery'
    and not exists (
      select 1 from public.deliveries
      where rider_id = v_id and status in ('picked_up', 'out_for_delivery')
    );
end;
$$;

create or replace function public.rider_cash_today()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := app.current_rider_id();
  v_result json;
begin
  if v_id is null then
    return null;
  end if;

  select json_build_object(
    'cash_on_hand', r.cash_on_hand,
    'collections', (
      select coalesce(json_agg(json_build_object(
        'id', cc.id,
        'amount', cc.amount,
        'order_number', o.order_number,
        'collected_at', cc.collected_at,
        'handed_over_at', cc.handed_over_at
      ) order by cc.collected_at desc), '[]'::json)
      from public.rider_cash_collections cc
      left join public.orders o on o.id = cc.order_id
      where cc.rider_id = r.id
        and (cc.collected_at >= date_trunc('day', now()) or cc.handed_over_at is null)
    )
  )
  into v_result
  from public.riders r
  where r.id = v_id;

  return v_result;
end;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'rider_me()',
    'rider_set_status(public.rider_status)',
    'rider_deliveries()',
    'rider_update_delivery(uuid, text, numeric, text)',
    'rider_cash_today()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;


-- ================================================================
-- 20261104000000_admin_operations.sql
-- ================================================================
-- Admin operations from the dashboard (edit products, customers, riders,
-- staff, orders, deliveries, payments, cash sessions).
-- Run after 20261102030000_rider_app.sql.

-- cashcarry_sql_schema.sql defined this BEFORE UPDATE trigger function without
-- `return new`, so every UPDATE on the tables it is attached to failed with
-- "control reached end of trigger procedure without RETURN".
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ================================================================
-- Admin (owner) access
-- ================================================================
insert into public.dashboard_super_admins (email) values ('asadkambo2022@gmail.com') on conflict (email) do nothing;

select email from public.dashboard_super_admins;
