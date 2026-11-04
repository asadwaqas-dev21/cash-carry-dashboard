'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, num, oneOf, optStr, referenceNumber, str, type ActionState } from '@/lib/action-state';
import { CLOSED_ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/enums';
import { formatMoney } from '@/lib/format';

function revalidatePayments(orderId?: string) {
  revalidatePath('/payments');
  revalidatePath('/orders', 'layout');
  revalidatePath('/cash');
  revalidatePath('/');
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

/** Records money received against an order's balance. The payments trigger updates the order's paid/due totals. */
export async function recordPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner', 'sales_person');
    const orderId = str(formData, 'order_id');
    if (!orderId) throw new Error('Choose an order.');
    const method = oneOf(formData, 'method', PAYMENT_METHODS, 'payment method');
    const amount = num(formData, 'amount');
    if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');

    const order = check(
      await supabase
        .from('orders')
        .select('id, customer_id, currency_code, due_total, status')
        .eq('id', orderId)
        .eq('org_id', user.orgId)
        .maybeSingle()
    ) as { id: string; customer_id: string | null; currency_code: string; due_total: number; status: string } | null;
    if (!order) throw new Error('Order not found.');
    if (CLOSED_ORDER_STATUSES.includes(order.status)) throw new Error(`This order is ${order.status}.`);
    const due = Number(order.due_total || 0);
    if (due <= 0) throw new Error('This order is already fully paid.');
    if (amount > due + 0.005) throw new Error(`Only ${formatMoney(due)} is due on this order.`);

    const notes = optStr(formData, 'notes');
    check(
      await supabase.from('payments').insert({
        org_id: user.orgId,
        order_id: order.id,
        customer_id: order.customer_id,
        payment_number: referenceNumber('PAY'),
        method,
        amount,
        currency_code: order.currency_code,
        provider_reference: optStr(formData, 'reference'),
        cash_received: method === 'cash' ? amount : null,
        received_by: user.id,
        metadata: notes ? { notes } : {},
      })
    );

    revalidatePayments(order.id);
    return 'Payment recorded.';
  });
}

/** Marks a payment as voided (e.g. refunded or entered by mistake); the order's balance goes back up. */
export async function voidPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const res = await supabase
      .from('payments')
      .update({ status: 'voided' })
      .eq('id', str(formData, 'id'))
      .eq('org_id', user.orgId)
      .eq('status', 'paid')
      .select('order_id');
    checkAffected(res);
    revalidatePayments(res.data?.[0]?.order_id ?? undefined);
    return 'Payment voided.';
  });
}
