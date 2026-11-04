'use server';

import { requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { check, defaultLocationId, referenceNumber } from '@/lib/action-state';
import { openSession } from '@/lib/cash';
import { recordStockMovement } from '@/lib/stock';

const round2 = (n: number) => Math.round(n * 100) / 100;

export type POSResult =
  | { success: true; orderNumber: string; total: number; tax: number; subtotal: number; items: { name: string; quantity: number; price: number; taxRate: number }[] }
  | { success: false; error: string };

/**
 * Rings up a counter sale. Prices, tax and stock come from the database, not
 * the browser; the cart only says which products and how many.
 */
export async function createPOSOrder(orderData: {
  cart: { id: string; quantity: number }[];
  paymentMethod: 'cash' | 'card';
  cashReceived?: number;
}): Promise<POSResult> {
  try {
    const { user, supabase } = await requireRole('owner', 'sales_person');
    const orgId = user.orgId;
    if (!['cash', 'card'].includes(orderData.paymentMethod)) throw new Error('Choose cash or card.');

    const cart = orderData.cart.filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);
    if (cart.length === 0) throw new Error('The cart is empty.');

    const locationId = await defaultLocationId(supabase, orgId);
    const [{ data: products }, { data: balances }, session, { data: org }] = await Promise.all([
      supabase.from('products').select('id, name, sku, retail_price, cost_price, tax_rate, status').in('id', cart.map((l) => l.id)),
      supabase.from('inventory_balances').select('product_id, quantity_on_hand').eq('location_id', locationId).in('product_id', cart.map((l) => l.id)),
      openSession(supabase, orgId, locationId),
      supabase.from('organizations').select('currency_code').eq('id', orgId).maybeSingle(),
    ]);

    const lines = cart.map((line) => {
      const product = (products || []).find((p) => p.id === line.id);
      if (!product || product.status !== 'active') throw new Error('A product in the cart is no longer for sale. Refresh the page.');
      const onHand = Number((balances || []).find((b) => b.product_id === line.id)?.quantity_on_hand || 0);
      if (line.quantity > onHand) {
        throw new Error(onHand > 0 ? `Only ${onHand} × ${product.name} in stock.` : `${product.name} is out of stock.`);
      }
      const price = Number(product.retail_price);
      const taxRate = Number(product.tax_rate || 0);
      return { product, quantity: line.quantity, price, taxRate, net: line.quantity * price };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.net, 0));
    const tax = round2(lines.reduce((s, l) => s + (l.net * l.taxRate) / 100, 0));
    const total = round2(subtotal + tax);

    let cashReceived: number | null = null;
    if (orderData.paymentMethod === 'cash') {
      cashReceived = Number(orderData.cashReceived);
      if (!Number.isFinite(cashReceived) || cashReceived < total) throw new Error('Cash received is less than the total.');
    }

    const orderNumber = referenceNumber('POS');
    const currency = org?.currency_code || 'PKR';
    const order = check(
      await supabase
        .from('orders')
        .insert({
          org_id: orgId,
          location_id: locationId,
          pos_session_id: session?.id ?? null,
          order_number: orderNumber,
          receipt_number: orderNumber,
          channel: 'pos',
          status: 'completed',
          items_count: lines.length,
          subtotal,
          tax_total: tax,
          grand_total: total,
          currency_code: currency,
          created_by: user.id,
        })
        .select('id')
        .single()
    ) as { id: string };

    // The order_items trigger recalculates the order totals from these lines.
    check(
      await supabase.from('order_items').insert(
        lines.map((l) => ({
          org_id: orgId,
          order_id: order.id,
          product_id: l.product.id,
          product_name: l.product.name,
          sku: l.product.sku,
          quantity: l.quantity,
          unit_price: l.price,
          unit_cost: Number(l.product.cost_price || 0),
          tax_rate: l.taxRate,
        }))
      )
    );

    // The payments trigger sets the order's paid total and payment status.
    check(
      await supabase.from('payments').insert({
        org_id: orgId,
        order_id: order.id,
        pos_session_id: session?.id ?? null,
        payment_number: `PAY-${orderNumber}`,
        method: orderData.paymentMethod,
        amount: total,
        currency_code: currency,
        cash_received: cashReceived,
        cash_change: cashReceived !== null ? round2(cashReceived - total) : null,
        received_by: user.id,
      })
    );

    for (const l of lines) {
      await recordStockMovement(supabase, {
        orgId,
        locationId,
        productId: l.product.id,
        type: 'sale',
        delta: -l.quantity,
        unitCost: Number(l.product.cost_price || 0),
        userId: user.id,
        referenceTable: 'orders',
        referenceId: order.id,
        notes: `POS sale ${orderNumber}`,
      });
    }

    revalidatePath('/pos');
    revalidatePath('/inventory');
    revalidatePath('/orders');
    revalidatePath('/payments');
    revalidatePath('/cash');
    revalidatePath('/');

    return {
      success: true,
      orderNumber,
      subtotal,
      tax,
      total,
      items: lines.map((l) => ({ name: l.product.name, quantity: l.quantity, price: l.price, taxRate: l.taxRate })),
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to process the sale.' };
  }
}
