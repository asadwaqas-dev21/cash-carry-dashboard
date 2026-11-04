// Mirrors the Postgres enums in cashcarry_sql_schema.sql.

export const CUSTOMER_TYPES = ['individual', 'business'] as const;
export const CUSTOMER_STATUSES = ['active', 'inactive', 'blocked'] as const;
export const PRODUCT_STATUSES = ['active', 'draft', 'archived'] as const;
export const STAFF_STATUSES = ['active', 'on_leave', 'inactive', 'terminated'] as const;
export const RIDER_STATUSES = ['available', 'on_delivery', 'on_break', 'off_shift', 'inactive'] as const;
export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'wallet', 'manual'] as const;

/** Statuses an admin can move an order to by hand. */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
] as const;

/** Orders in these states no longer count toward sales. */
export const CLOSED_ORDER_STATUSES = ['cancelled', 'voided', 'refunded'];

export const ACTIVE_DELIVERY_STATUSES = ['pending', 'assigned', 'picked_up', 'out_for_delivery'];
