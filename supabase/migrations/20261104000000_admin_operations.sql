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
