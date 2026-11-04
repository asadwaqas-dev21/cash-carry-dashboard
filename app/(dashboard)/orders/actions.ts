'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, oneOf, optStr, str, type ActionState } from '@/lib/action-state';
import { ACTIVE_DELIVERY_STATUSES, CLOSED_ORDER_STATUSES, ORDER_STATUSES } from '@/lib/enums';
import { labelize } from '@/lib/format';
import { recordStockMovement } from '@/lib/stock';

/** Moves an order to a new status. Cancelling (owners only) returns sold stock and stops deliveries. */
export async function updateOrderStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const id = str(formData, 'id');
    const status = oneOf(formData, 'status', ORDER_STATUSES, 'status');
    const closing = CLOSED_ORDER_STATUSES.includes(status);
    const { user, supabase } = closing ? await requireRole('owner') : await requireRole('owner', 'sales_person');
    const notes = optStr(formData, 'notes');

    const order = check(
      await supabase
        .from('orders')
        .select('id, order_number, status, paid_total')
        .eq('id', id)
        .eq('org_id', user.orgId)
        .maybeSingle()
    ) as { id: string; order_number: string; status: string; paid_total: number } | null;
    if (!order) throw new Error('Order not found.');
    if (CLOSED_ORDER_STATUSES.includes(order.status)) throw new Error(`This order is ${order.status} and can’t be changed.`);
    if (order.status === status) throw new Error(`The order is already ${labelize(status)}.`);

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status };
    if (status === 'confirmed') patch.confirmed_at = now;
    if (status === 'delivered') patch.delivered_at = now;
    if (closing) {
      patch.cancelled_at = now;
      patch.cancelled_reason = notes;
    }
    checkAffected(await supabase.from('orders').update(patch).eq('id', id).eq('org_id', user.orgId).select('id'));

    await supabase.from('order_status_history').insert({
      org_id: user.orgId,
      order_id: id,
      old_status: order.status,
      new_status: status,
      changed_by: user.id,
      notes,
    });

    if (closing) {
      // Put back whatever this order took out of stock.
      const { data: sales } = await supabase
        .from('stock_movements')
        .select('location_id, product_id, quantity_delta')
        .eq('org_id', user.orgId)
        .eq('reference_id', id)
        .eq('type', 'sale');
      for (const sale of sales || []) {
        await recordStockMovement(supabase, {
          orgId: user.orgId,
          locationId: sale.location_id,
          productId: sale.product_id,
          type: 'void',
          delta: -Number(sale.quantity_delta),
          userId: user.id,
          referenceTable: 'orders',
          referenceId: id,
          notes: `Order ${order.order_number} cancelled`,
        });
      }

      const { data: stopped } = await supabase
        .from('deliveries')
        .update({ status: 'cancelled' })
        .eq('order_id', id)
        .in('status', ACTIVE_DELIVERY_STATUSES)
        .select('id');
      if (stopped?.length) await supabase.from('orders').update({ delivery_status: 'cancelled' }).eq('id', id);
    }

    revalidatePath('/orders', 'layout');
    revalidatePath('/deliveries');
    revalidatePath('/inventory');
    revalidatePath('/');
    if (closing && Number(order.paid_total) > 0) {
      return 'Order cancelled and stock returned. It had payments: void them under Payments if you refunded the money.';
    }
    return closing ? 'Order cancelled and stock returned.' : `Order marked ${labelize(status)}.`;
  });
}
