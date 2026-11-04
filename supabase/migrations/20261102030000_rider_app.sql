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
