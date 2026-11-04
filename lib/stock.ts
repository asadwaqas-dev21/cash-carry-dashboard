import type { SupabaseClient } from '@supabase/supabase-js';
import { check } from './action-state';

export type StockMovementType =
  | 'sale'
  | 'return'
  | 'purchase_receive'
  | 'manual_adjustment'
  | 'damage_writeoff'
  | 'void';

export async function currentStock(supabase: SupabaseClient, orgId: string, locationId: string, productId: string) {
  const { data } = await supabase
    .from('inventory_balances')
    .select('quantity_on_hand')
    .eq('org_id', orgId)
    .eq('location_id', locationId)
    .eq('product_id', productId)
    .maybeSingle();
  return Number(data?.quantity_on_hand || 0);
}

/**
 * Records a stock change. The trg_apply_stock_movement trigger applies it to
 * inventory_balances (creating the row if needed) and rejects negative stock.
 */
export async function recordStockMovement(
  supabase: SupabaseClient,
  movement: {
    orgId: string;
    locationId: string;
    productId: string;
    type: StockMovementType;
    delta: number;
    userId: string;
    notes?: string | null;
    unitCost?: number | null;
    referenceTable?: string;
    referenceId?: string;
  }
) {
  if (movement.delta === 0) return;
  const res = await supabase.from('stock_movements').insert({
    org_id: movement.orgId,
    location_id: movement.locationId,
    product_id: movement.productId,
    type: movement.type,
    quantity_delta: movement.delta,
    unit_cost: movement.unitCost ?? null,
    reference_table: movement.referenceTable ?? null,
    reference_id: movement.referenceId ?? null,
    notes: movement.notes ?? null,
    performed_by: movement.userId,
  });
  if (res.error?.message.includes('Insufficient stock')) {
    throw new Error('Not enough stock for this change.');
  }
  check(res);
}
