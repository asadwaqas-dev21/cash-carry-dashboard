-- ================================================================
-- Kirana Cash & Carry — Supabase SQL Schema
-- Generated for the operations dashboard UI:
-- Overview, Orders, POS, Products, Inventory, Deliveries,
-- Categories, Customers, Riders, Staff, Payments, Cash, Analytics.
--
-- Run in a fresh Supabase project SQL editor.
-- ================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

-- ---------- App helper schema ----------
create schema if not exists app;

-- ---------- Enums ----------
do $$ begin create type public.user_role as enum ('owner','sales_person'); exception when duplicate_object then null; end $$;
do $$ begin create type public.staff_status as enum ('active','inactive','on_leave','terminated'); exception when duplicate_object then null; end $$;
do $$ begin create type public.shift_status as enum ('scheduled','active','on_break','closed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.location_type as enum ('warehouse','store','dark_store','counter','office'); exception when duplicate_object then null; end $$;
do $$ begin create type public.customer_type as enum ('individual','business'); exception when duplicate_object then null; end $$;
do $$ begin create type public.customer_status as enum ('active','blocked','inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public.supplier_status as enum ('active','inactive','blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.product_status as enum ('draft','active','low_stock','out_of_stock','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stock_movement_type as enum ('sale','return','purchase_receive','manual_adjustment','damage_writeoff','transfer_in','transfer_out','reservation','reservation_release','void'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_channel as enum ('pos','app','phone','walk_in','wholesale_portal'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('draft','pending','confirmed','preparing','ready','paid','out_for_delivery','delivered','completed','cancelled','voided','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('unpaid','partially_paid','paid','failed','refunded','voided'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_method as enum ('cash','card','bank_transfer','wallet','credit','mixed','manual'); exception when duplicate_object then null; end $$;
do $$ begin create type public.delivery_status as enum ('not_required','pending','assigned','picked_up','out_for_delivery','delivered','failed','cancelled','returned'); exception when duplicate_object then null; end $$;
do $$ begin create type public.rider_status as enum ('available','on_delivery','on_break','off_shift','inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public.pos_device_status as enum ('online','offline','syncing','error','disabled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.pos_session_status as enum ('open','paused','closed','force_closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.cash_reconciliation_status as enum ('draft','submitted','approved','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.purchase_order_status as enum ('draft','sent','partially_received','received','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.transfer_status as enum ('draft','sent','received','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notification_type as enum ('stock_alert','new_order','payment','delivery','system','cash','staff'); exception when duplicate_object then null; end $$;

-- ---------- Utility functions ----------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
end;
$$;

create or replace function app.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  -- If role is changing, ensure user is owner
  if new.role is distinct from old.role then
    if not app.is_admin() then
      raise exception 'Only an owner can change a user role';
    end if;
  end if;
  return new;
end;
$$;


-- ================================================================
-- 1) Multi-tenant org, users, locations
-- ================================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique not null,
  currency_code char(3) not null default 'PKR',
  timezone text not null default 'Asia/Dubai',
  default_tax_rate numeric(5,2) not null default 0 check (default_tax_rate >= 0),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  phone text,
  role public.user_role not null default 'sales_person',
  is_active boolean not null default true,
  last_seen_at timestamptz,
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function app.prevent_role_escalation();

-- Returns org of the logged-in Supabase Auth user.
create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function app.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app.current_role() = 'owner', false)
$$;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code citext not null,
  type public.location_type not null default 'warehouse',
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  country text not null default 'United Arab Emirates',
  postal_code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  phone text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  employee_code citext not null,
  full_name text not null,
  email citext,
  phone text,
  role public.user_role not null default 'sales_person',
  status public.staff_status not null default 'active',
  hire_date date,
  salary numeric(14,2) check (salary is null or salary >= 0),
  emergency_contact jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, employee_code)
);

create table if not exists public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  status public.shift_status not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  opening_notes text,
  closing_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

-- ================================================================
-- 2) Customers and addresses
-- ================================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_code citext,
  type public.customer_type not null default 'individual',
  status public.customer_status not null default 'active',
  display_name text not null,
  business_name text,
  contact_person text,
  email citext,
  phone text,
  alternate_phone text,
  tax_number text,
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  current_credit_balance numeric(14,2) not null default 0,
  wholesale_enabled boolean not null default false,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, customer_code)
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null default 'Default',
  recipient_name text,
  phone text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text,
  country text not null default 'United Arab Emirates',
  postal_code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ================================================================
-- 3) Suppliers, categories, brands, products
-- ================================================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  supplier_code citext,
  name text not null,
  status public.supplier_status not null default 'active',
  contact_person text,
  email citext,
  phone text,
  address text,
  city text,
  country text,
  payment_terms text,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, supplier_code)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug citext not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug citext not null,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table if not exists public.units_of_measure (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code citext not null,
  name text not null,
  allow_decimal boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  unit_id uuid references public.units_of_measure(id) on delete set null,
  sku citext not null,
  barcode citext,
  name text not null,
  description text,
  image_url text,
  status public.product_status not null default 'active',
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  retail_price numeric(14,2) not null default 0 check (retail_price >= 0),
  wholesale_price numeric(14,2) not null default 0 check (wholesale_price >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  reorder_quantity numeric(14,3) not null default 0 check (reorder_quantity >= 0),
  pack_size text,
  weight_kg numeric(12,3) check (weight_kg is null or weight_kg >= 0),
  dimensions jsonb not null default '{}',
  searchable tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku::text,'') || ' ' || coalesce(barcode::text,'') || ' ' || coalesce(description,''))
  ) stored,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, sku),
  unique (org_id, barcode)
);

create table if not exists public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  barcode citext not null,
  label text,
  created_at timestamptz not null default now(),
  unique (org_id, barcode)
);

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  old_retail_price numeric(14,2),
  new_retail_price numeric(14,2),
  old_wholesale_price numeric(14,2),
  new_wholesale_price numeric(14,2),
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

-- ================================================================
-- 4) Inventory, movements, transfers, purchase orders
-- ================================================================

create table if not exists public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_on_hand numeric(14,3) not null default 0,
  quantity_reserved numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  reorder_quantity numeric(14,3) not null default 0,
  last_counted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (org_id, location_id, product_id),
  check (quantity_on_hand >= 0),
  check (quantity_reserved >= 0)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  type public.stock_movement_type not null,
  quantity_delta numeric(14,3) not null,
  quantity_before numeric(14,3),
  quantity_after numeric(14,3),
  unit_cost numeric(14,2),
  reference_table text,
  reference_id uuid,
  notes text,
  performed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  from_location_id uuid not null references public.locations(id) on delete restrict,
  to_location_id uuid not null references public.locations(id) on delete restrict,
  status public.transfer_status not null default 'draft',
  requested_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_location_id <> to_location_id)
);

create table if not exists public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (transfer_id, product_id)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  po_number citext not null,
  status public.purchase_order_status not null default 'draft',
  expected_at timestamptz,
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, po_number)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_ordered numeric(14,3) not null check (quantity_ordered > 0),
  quantity_received numeric(14,3) not null default 0 check (quantity_received >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  tax_rate numeric(5,2) not null default 0,
  line_total numeric(14,2) generated always as ((quantity_ordered * unit_cost) + ((quantity_ordered * unit_cost) * tax_rate / 100)) stored,
  created_at timestamptz not null default now()
);

-- ================================================================
-- 5) POS devices, sessions, orders, payments
-- ================================================================

create table if not exists public.pos_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  device_code citext not null,
  name text not null,
  app_version text,
  status public.pos_device_status not null default 'offline',
  last_sync_at timestamptz,
  cash_drawer_status text,
  receipt_printer_status text,
  barcode_scanner_status text,
  card_machine_status text,
  hardware jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, device_code)
);

create table if not exists public.pos_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  device_id uuid not null references public.pos_devices(id) on delete restrict,
  staff_id uuid references public.staff(id) on delete set null,
  shift_id uuid references public.staff_shifts(id) on delete set null,
  status public.pos_session_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_float numeric(14,2) not null default 0 check (opening_float >= 0),
  expected_cash numeric(14,2) not null default 0,
  counted_cash numeric(14,2),
  cash_difference numeric(14,2) generated always as (coalesce(counted_cash, expected_cash) - expected_cash) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_at is null or closed_at >= opened_at)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_address_id uuid references public.customer_addresses(id) on delete set null,
  pos_session_id uuid references public.pos_sessions(id) on delete set null,
  order_number citext not null,
  receipt_number citext,
  channel public.order_channel not null default 'pos',
  status public.order_status not null default 'draft',
  payment_status public.payment_status not null default 'unpaid',
  delivery_status public.delivery_status not null default 'not_required',
  items_count integer not null default 0 check (items_count >= 0),
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  delivery_fee numeric(14,2) not null default 0 check (delivery_fee >= 0),
  grand_total numeric(14,2) not null default 0 check (grand_total >= 0),
  paid_total numeric(14,2) not null default 0 check (paid_total >= 0),
  due_total numeric(14,2) generated always as (greatest(grand_total - paid_total, 0)) stored,
  currency_code char(3) not null default 'PKR',
  placed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, order_number),
  unique (org_id, receipt_number)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  product_name text not null,
  sku citext,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0),
  tax_amount numeric(14,2) generated always as (((quantity * unit_price) - discount_amount) * tax_rate / 100) stored,
  line_total numeric(14,2) generated always as (((quantity * unit_price) - discount_amount) + (((quantity * unit_price) - discount_amount) * tax_rate / 100)) stored,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  pos_session_id uuid references public.pos_sessions(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  payment_number citext,
  method public.payment_method not null,
  status public.payment_status not null default 'paid',
  amount numeric(14,2) not null check (amount >= 0),
  currency_code char(3) not null default 'PKR',
  provider text,
  provider_reference text,
  card_last4 text,
  cash_received numeric(14,2),
  cash_change numeric(14,2),
  received_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (org_id, payment_number)
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  reason text,
  refunded_by uuid references public.profiles(id) on delete set null,
  refunded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ================================================================
-- 6) Deliveries, riders, cash collection
-- ================================================================

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  rider_code citext not null,
  full_name text not null,
  phone text,
  vehicle_type text,
  vehicle_number text,
  status public.rider_status not null default 'off_shift',
  current_location_id uuid references public.locations(id) on delete set null,
  current_latitude numeric(10,7),
  current_longitude numeric(10,7),
  cash_on_hand numeric(14,2) not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, rider_code)
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  rider_id uuid references public.riders(id) on delete set null,
  status public.delivery_status not null default 'pending',
  pickup_location_id uuid references public.locations(id) on delete set null,
  dropoff_address_id uuid references public.customer_addresses(id) on delete set null,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  estimated_distance_km numeric(10,2),
  delivery_fee numeric(14,2) not null default 0,
  cash_to_collect numeric(14,2) not null default 0,
  cash_collected numeric(14,2) not null default 0,
  proof_image_url text,
  customer_signature_url text,
  failure_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rider_location_pings (
  id bigserial primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  speed_kph numeric(8,2),
  battery_percent integer check (battery_percent between 0 and 100),
  recorded_at timestamptz not null default now()
);

create table if not exists public.rider_cash_collections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete restrict,
  delivery_id uuid references public.deliveries(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  collected_at timestamptz not null default now(),
  handed_over_at timestamptz,
  received_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- ================================================================
-- 7) Cash reconciliation, notifications, audit/activity
-- ================================================================

create table if not exists public.cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  pos_session_id uuid references public.pos_sessions(id) on delete set null,
  rider_id uuid references public.riders(id) on delete set null,
  status public.cash_reconciliation_status not null default 'draft',
  expected_cash numeric(14,2) not null default 0,
  counted_cash numeric(14,2) not null default 0,
  difference numeric(14,2) generated always as (counted_cash - expected_cash) stored,
  denominations jsonb not null default '{}',
  submitted_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  entity_table text,
  entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  title text not null,
  description text,
  entity_table text,
  entity_id uuid,
  severity text not null default 'info',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  row_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ================================================================
-- 8) Business logic triggers
-- ================================================================

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','locations','staff','staff_shifts','customers','customer_addresses',
    'suppliers','categories','brands','products','inventory_balances','stock_transfers',
    'purchase_orders','pos_devices','pos_sessions','orders','riders','deliveries','cash_reconciliations'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function app.set_updated_at()', t, t);
  end loop;
end $$;

-- Stock movement applies quantity changes to inventory_balances.
create or replace function app.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_qty numeric(14,3);
  after_qty numeric(14,3);
begin
  select quantity_on_hand into before_qty
  from public.inventory_balances
  where org_id = new.org_id and location_id = new.location_id and product_id = new.product_id
  for update;

  if before_qty is null then
    before_qty := 0;
    insert into public.inventory_balances (org_id, location_id, product_id, quantity_on_hand)
    values (new.org_id, new.location_id, new.product_id, 0)
    on conflict (org_id, location_id, product_id) do nothing;
  end if;

  after_qty := before_qty + new.quantity_delta;
  if after_qty < 0 then
    raise exception 'Insufficient stock for product %, location %. Current: %, delta: %',
      new.product_id, new.location_id, before_qty, new.quantity_delta;
  end if;

  update public.inventory_balances
  set quantity_on_hand = after_qty,
      updated_at = now()
  where org_id = new.org_id and location_id = new.location_id and product_id = new.product_id;

  new.quantity_before := before_qty;
  new.quantity_after := after_qty;
  return new;
end;
$$;

drop trigger if exists trg_apply_stock_movement on public.stock_movements;
create trigger trg_apply_stock_movement
before insert on public.stock_movements
for each row execute function app.apply_stock_movement();

-- Recalculate order totals from order_items.
create or replace function app.recalculate_order_totals(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders o
  set
    items_count = coalesce(x.items_count, 0),
    subtotal = coalesce(x.subtotal, 0),
    discount_total = coalesce(x.discount_total, 0),
    tax_total = coalesce(x.tax_total, 0),
    grand_total = greatest(coalesce(x.line_total, 0) + o.delivery_fee, 0),
    updated_at = now()
  from (
    select
      order_id,
      count(*)::int as items_count,
      sum(quantity * unit_price) as subtotal,
      sum(discount_amount) as discount_total,
      sum(tax_amount) as tax_total,
      sum(line_total) as line_total
    from public.order_items
    where order_id = p_order_id
    group by order_id
  ) x
  where o.id = p_order_id and o.id = x.order_id;

  update public.orders
  set items_count = 0,
      subtotal = 0,
      discount_total = 0,
      tax_total = 0,
      grand_total = delivery_fee,
      updated_at = now()
  where id = p_order_id
    and not exists (select 1 from public.order_items where order_id = p_order_id);
end;
$$;

create or replace function app.order_items_totals_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.order_id is distinct from new.order_id then
    perform app.recalculate_order_totals(old.order_id);
    perform app.recalculate_order_totals(new.order_id);
  else
    perform app.recalculate_order_totals(coalesce(new.order_id, old.order_id));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_order_items_recalculate_totals on public.order_items;
create trigger trg_order_items_recalculate_totals
after insert or update or delete on public.order_items
for each row execute function app.order_items_totals_trigger();

-- Update order paid totals from successful payments.
create or replace function app.recalculate_order_payments(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  paid numeric(14,2);
  total numeric(14,2);
begin
  select coalesce(sum(amount),0) into paid
  from public.payments
  where order_id = p_order_id and status = 'paid';

  select grand_total into total from public.orders where id = p_order_id;

  update public.orders
  set paid_total = paid,
      payment_status = case
        when paid <= 0 then 'unpaid'::public.payment_status
        when paid < total then 'partially_paid'::public.payment_status
        else 'paid'::public.payment_status
      end,
      updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function app.payments_totals_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.order_id is distinct from new.order_id then
    if old.order_id is not null then
      perform app.recalculate_order_payments(old.order_id);
    end if;
    if new.order_id is not null then
      perform app.recalculate_order_payments(new.order_id);
    end if;
  else
    if coalesce(new.order_id, old.order_id) is not null then
      perform app.recalculate_order_payments(coalesce(new.order_id, old.order_id));
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_payments_recalculate_order on public.payments;
create trigger trg_payments_recalculate_order
after insert or update or delete on public.payments
for each row execute function app.payments_totals_trigger();

-- ================================================================
-- 9) Views for dashboard pages
-- ================================================================

create or replace view public.v_recent_orders
with (security_invoker = true) as
select
  o.org_id,
  o.id,
  o.order_number,
  o.receipt_number,
  o.channel,
  o.status,
  o.payment_status,
  o.delivery_status,
  o.items_count,
  o.grand_total,
  o.placed_at,
  c.display_name as customer_name,
  c.type as customer_type,
  l.name as location_name
from public.orders o
left join public.customers c on c.id = o.customer_id
left join public.locations l on l.id = o.location_id;

create or replace view public.v_low_stock
with (security_invoker = true) as
select
  ib.org_id,
  ib.location_id,
  l.name as location_name,
  p.id as product_id,
  p.sku,
  p.name as product_name,
  b.name as brand_name,
  c.name as category_name,
  ib.quantity_on_hand,
  coalesce(nullif(ib.reorder_level,0), p.reorder_level) as reorder_level,
  coalesce(nullif(ib.reorder_quantity,0), p.reorder_quantity) as suggested_qty,
  case
    when ib.quantity_on_hand <= 0 then 'out_of_stock'
    when ib.quantity_on_hand <= coalesce(nullif(ib.reorder_level,0), p.reorder_level) then 'low_stock'
    else 'ok'
  end as stock_state
from public.inventory_balances ib
join public.products p on p.id = ib.product_id
left join public.locations l on l.id = ib.location_id
left join public.brands b on b.id = p.brand_id
left join public.categories c on c.id = p.category_id
where ib.quantity_on_hand <= coalesce(nullif(ib.reorder_level,0), p.reorder_level);

create or replace view public.v_top_movers_today
with (security_invoker = true) as
select
  oi.org_id,
  oi.product_id,
  oi.product_name,
  oi.sku,
  sum(oi.quantity) as units_sold,
  sum(oi.line_total) as revenue,
  count(distinct oi.order_id) as order_count
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.placed_at >= date_trunc('day', now())
  and o.status not in ('cancelled','voided')
group by oi.org_id, oi.product_id, oi.product_name, oi.sku
order by units_sold desc;

create or replace view public.v_pos_session_snapshot
with (security_invoker = true) as
select
  ps.org_id,
  ps.id as pos_session_id,
  ps.status,
  ps.opened_at,
  ps.closed_at,
  pd.device_code,
  pd.name as device_name,
  s.full_name as operator_name,
  l.name as location_name,
  coalesce(sum(o.grand_total) filter (where o.status not in ('cancelled','voided')),0) as session_revenue,
  count(o.id) filter (where o.status not in ('cancelled','voided')) as transactions,
  coalesce(avg(o.grand_total) filter (where o.status not in ('cancelled','voided')),0) as average_ticket,
  coalesce(sum(p.amount) filter (where p.method = 'cash' and p.status = 'paid'),0) as cash_total,
  coalesce(sum(p.amount) filter (where p.method = 'card' and p.status = 'paid'),0) as card_total,
  ps.opening_float,
  ps.expected_cash,
  ps.counted_cash
from public.pos_sessions ps
join public.pos_devices pd on pd.id = ps.device_id
left join public.staff s on s.id = ps.staff_id
left join public.locations l on l.id = ps.location_id
left join public.orders o on o.pos_session_id = ps.id
left join public.payments p on p.order_id = o.id
group by ps.id, pd.device_code, pd.name, s.full_name, l.name;

create or replace view public.v_daily_sales_summary
with (security_invoker = true) as
select
  o.org_id,
  date_trunc('day', o.placed_at)::date as sales_date,
  o.channel,
  count(*) as orders_count,
  sum(o.grand_total) as revenue,
  sum(o.paid_total) as paid_total,
  avg(o.grand_total) as average_order_value
from public.orders o
where o.status not in ('cancelled','voided')
group by o.org_id, date_trunc('day', o.placed_at)::date, o.channel;

create or replace view public.v_rider_performance_today
with (security_invoker = true) as
select
  r.org_id,
  r.id as rider_id,
  r.rider_code,
  r.full_name,
  r.status,
  count(d.id) filter (where d.created_at >= date_trunc('day', now())) as deliveries_today,
  count(d.id) filter (where d.status = 'delivered' and d.created_at >= date_trunc('day', now())) as delivered_today,
  coalesce(sum(d.cash_collected) filter (where d.created_at >= date_trunc('day', now())),0) as cash_collected_today,
  r.cash_on_hand
from public.riders r
left join public.deliveries d on d.rider_id = r.id
group by r.id;

-- ================================================================
-- 10) Indexes
-- ================================================================

create index if not exists idx_profiles_org on public.profiles(org_id);
create index if not exists idx_locations_org on public.locations(org_id);
create index if not exists idx_staff_org_status on public.staff(org_id, status);
create index if not exists idx_staff_shifts_staff_time on public.staff_shifts(staff_id, starts_at desc);
create index if not exists idx_customers_org_type_status on public.customers(org_id, type, status);
create index if not exists idx_customers_search on public.customers using gin ((display_name || ' ' || coalesce(phone,'') || ' ' || coalesce(email::text,'')) gin_trgm_ops);
create index if not exists idx_categories_org_parent on public.categories(org_id, parent_id);
create index if not exists idx_products_org_status on public.products(org_id, status);
create index if not exists idx_products_category on public.products(org_id, category_id);
create index if not exists idx_products_searchable on public.products using gin(searchable);
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_inventory_product_location on public.inventory_balances(org_id, product_id, location_id);
create index if not exists idx_stock_movements_product_time on public.stock_movements(product_id, created_at desc);
create index if not exists idx_stock_movements_org_time on public.stock_movements(org_id, created_at desc);
create index if not exists idx_orders_org_time on public.orders(org_id, placed_at desc);
create index if not exists idx_orders_customer on public.orders(customer_id, placed_at desc);
create index if not exists idx_orders_status_channel on public.orders(org_id, status, channel);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product_time on public.order_items(product_id, created_at desc);
create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_payments_org_time on public.payments(org_id, paid_at desc);
create index if not exists idx_pos_sessions_org_status on public.pos_sessions(org_id, status);
create index if not exists idx_deliveries_org_status on public.deliveries(org_id, status);
create index if not exists idx_deliveries_rider_status on public.deliveries(rider_id, status);
create index if not exists idx_rider_pings_rider_time on public.rider_location_pings(rider_id, recorded_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_activity_org_time on public.activity_events(org_id, created_at desc);

-- ================================================================
-- 11) Row Level Security
-- ================================================================

alter table public.organizations enable row level security;
drop policy if exists "org members can read their organization" on public.organizations;
create policy "org members can read their organization"
on public.organizations
for select
to authenticated
using (id = app.current_org_id());

drop policy if exists "admins can update their organization" on public.organizations;
create policy "admins can update their organization"
on public.organizations
for update
to authenticated
using (id = app.current_org_id() and app.is_admin())
with check (id = app.current_org_id() and app.is_admin());

alter table public.profiles enable row level security;
drop policy if exists "members can read profiles in same org" on public.profiles;
create policy "members can read profiles in same org"
on public.profiles
for select
to authenticated
using (org_id = app.current_org_id());

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and org_id = app.current_org_id());

drop policy if exists "admins can manage profiles in org" on public.profiles;
create policy "admins can manage profiles in org"
on public.profiles
for all
to authenticated
using (org_id = app.current_org_id() and app.is_admin())
with check (org_id = app.current_org_id() and app.is_admin());

-- Generic org-isolation RLS for every operational table with org_id.
do $$
declare
  t text;
  -- Tables where sales_person gets full operational access (insert/update)
  dashboard_handler_tables text[] := array[
    'pos_devices','pos_sessions','orders','order_items','order_status_history',
    'customers','customer_addresses','payments','refunds','deliveries',
    'cash_reconciliations','notifications','stock_movements','activity_events'
  ];
  -- Tables where sales_person ONLY gets read access
  read_only_tables text[] := array[
    'locations','staff_shifts','suppliers','categories',
    'brands','units_of_measure','products','product_barcodes','product_price_history',
    'inventory_balances','stock_transfers','stock_transfer_items',
    'purchase_orders','purchase_order_items','riders','rider_location_pings',
    'rider_cash_collections'
  ];
  -- Tables completely hidden from sales_person
  admin_only_tables text[] := array[
    'staff','audit_logs'
  ];
begin
  -- 1) Process dashboard handler tables (sales_person can read/insert/update, owner can do all including delete)
  foreach t in array dashboard_handler_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || ' org read', t);
    execute format('create policy %I on public.%I for select to authenticated using (org_id = app.current_org_id())', t || ' org read', t);

    execute format('drop policy if exists %I on public.%I', t || ' org insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (org_id = app.current_org_id())', t || ' org insert', t);

    execute format('drop policy if exists %I on public.%I', t || ' org update', t);
    execute format('create policy %I on public.%I for update to authenticated using (org_id = app.current_org_id()) with check (org_id = app.current_org_id())', t || ' org update', t);

    execute format('drop policy if exists %I on public.%I', t || ' admin delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (org_id = app.current_org_id() and app.is_admin())', t || ' admin delete', t);
  end loop;

  -- 2) Process read-only tables (sales_person can read, owner can do all)
  foreach t in array read_only_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || ' org read', t);
    execute format('create policy %I on public.%I for select to authenticated using (org_id = app.current_org_id())', t || ' org read', t);

    execute format('drop policy if exists %I on public.%I', t || ' org insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (org_id = app.current_org_id() and app.is_admin())', t || ' org insert', t);

    execute format('drop policy if exists %I on public.%I', t || ' org update', t);
    execute format('create policy %I on public.%I for update to authenticated using (org_id = app.current_org_id() and app.is_admin()) with check (org_id = app.current_org_id() and app.is_admin())', t || ' org update', t);

    execute format('drop policy if exists %I on public.%I', t || ' admin delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (org_id = app.current_org_id() and app.is_admin())', t || ' admin delete', t);
  end loop;

  -- 3) Process admin-only tables (owner can do all, sales_person nothing)
  foreach t in array admin_only_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || ' admin read', t);
    execute format('create policy %I on public.%I for select to authenticated using (org_id = app.current_org_id() and app.is_admin())', t || ' admin read', t);

    execute format('drop policy if exists %I on public.%I', t || ' admin insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (org_id = app.current_org_id() and app.is_admin())', t || ' admin insert', t);

    execute format('drop policy if exists %I on public.%I', t || ' admin update', t);
    execute format('create policy %I on public.%I for update to authenticated using (org_id = app.current_org_id() and app.is_admin()) with check (org_id = app.current_org_id() and app.is_admin())', t || ' admin update', t);

    execute format('drop policy if exists %I on public.%I', t || ' admin delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (org_id = app.current_org_id() and app.is_admin())', t || ' admin delete', t);
  end loop;
end $$;

-- ================================================================
-- 12) Storage bucket for product images and delivery proof
-- ================================================================

insert into storage.buckets (id, name, public)
values ('kirana-public', 'kirana-public', true)
on conflict (id) do nothing;

drop policy if exists "authenticated users can upload cash & carry public files" on storage.objects;
create policy "authenticated users can upload cash & carry public files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'cash-carry-public');

drop policy if exists "public can read cash & carry public files" on storage.objects;
create policy "public can read cash & carry public files"
on storage.objects
for select
to public
using (bucket_id = 'kirana-public');

-- ================================================================
-- 13) Starter reference data
-- ================================================================

-- Example unit rows should be inserted per organization after org creation:
-- insert into public.units_of_measure (org_id, code, name, allow_decimal) values
--   ('<org-id>', 'PCS', 'Pieces', false),
--   ('<org-id>', 'KG', 'Kilogram', true),
--   ('<org-id>', 'L', 'Liter', true),
--   ('<org-id>', 'PK', 'Pack', false);

-- Suggested order flow:
-- App: pending -> confirmed -> preparing -> out_for_delivery -> delivered
-- POS: draft -> paid/completed
-- Cancelled/voided orders should not reduce inventory unless you insert reversing stock_movements.
