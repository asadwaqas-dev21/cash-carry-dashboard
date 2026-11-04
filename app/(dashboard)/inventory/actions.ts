'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, num, oneOf, optStr, str, type ActionState } from '@/lib/action-state';
import { currentStock, recordStockMovement, type StockMovementType } from '@/lib/stock';

const MODES = ['receive', 'return', 'damage', 'count'] as const;

const MOVEMENT_TYPE: Record<(typeof MODES)[number], StockMovementType> = {
  receive: 'purchase_receive',
  return: 'return',
  damage: 'damage_writeoff',
  count: 'manual_adjustment',
};

/** Stock in (received/returned), out (damaged) or a physical count that sets the exact quantity. */
export async function adjustStock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const productId = str(formData, 'product_id');
    const locationId = str(formData, 'location_id');
    const mode = oneOf(formData, 'mode', MODES, 'adjustment type');
    const quantity = num(formData, 'quantity', -1);
    if (quantity < 0) throw new Error('Enter a quantity of zero or more.');
    if (mode !== 'count' && quantity === 0) throw new Error('Enter a quantity greater than zero.');

    const onHand = await currentStock(supabase, user.orgId, locationId, productId);
    const delta = mode === 'count' ? quantity - onHand : mode === 'damage' ? -quantity : quantity;
    if (mode === 'damage' && quantity > onHand) throw new Error(`Only ${onHand} in stock.`);

    await recordStockMovement(supabase, {
      orgId: user.orgId,
      locationId,
      productId,
      type: MOVEMENT_TYPE[mode],
      delta,
      userId: user.id,
      notes: optStr(formData, 'notes'),
      unitCost: mode === 'receive' ? num(formData, 'unit_cost') || null : null,
    });

    if (mode === 'count') {
      await supabase
        .from('inventory_balances')
        .update({ last_counted_at: new Date().toISOString() })
        .eq('org_id', user.orgId)
        .eq('location_id', locationId)
        .eq('product_id', productId);
    }

    revalidatePath('/inventory');
    revalidatePath('/products', 'layout');
    revalidatePath('/pos');
    if (mode === 'count') return delta === 0 ? 'Count matches the system.' : `Stock corrected by ${delta > 0 ? '+' : ''}${delta}.`;
    return 'Stock updated.';
  });
}
