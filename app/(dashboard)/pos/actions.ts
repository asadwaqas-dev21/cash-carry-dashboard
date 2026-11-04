'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Re-using the same org ID helper (ideally in a shared lib, but redefining for simplicity in POS)
async function getOrCreateOrganizationId() {
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  return orgs?.[0]?.id || null;
}

export async function createPOSOrder(orderData: {
  cart: { id: string; name: string; price: number; quantity: number }[];
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  cashChange?: number;
}) {
  const org_id = await getOrCreateOrganizationId();
  if (!org_id) throw new Error('Organization not found');

  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', org_id)
    .limit(1)
    .maybeSingle();

  // Generate a random order number like ORD-POS-XXXX
  const orderNumber = `ORD-POS-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Create the Order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      org_id,
      location_id: location?.id || null,
      order_number: orderNumber,
      channel: 'pos',
      status: 'completed',
      payment_status: 'paid',
      items_count: orderData.cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: orderData.total,
      grand_total: orderData.total,
      paid_total: orderData.total,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('Failed to create order:', orderError);
    throw new Error('Failed to create order');
  }

  // 2. Create Order Items
  const orderItems = orderData.cart.map(item => ({
    org_id,
    order_id: order.id,
    product_id: item.id,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    console.error('Failed to insert order items:', itemsError);
  }

  // 3. Record Payment
  const { error: paymentError } = await supabase.from('payments').insert({
    org_id,
    order_id: order.id,
    payment_number: `PAY-${orderNumber}`,
    method: orderData.paymentMethod,
    amount: orderData.total,
    cash_received: orderData.cashReceived || null,
    cash_change: orderData.cashChange || null,
  });

  if (paymentError) {
    console.error('Failed to record payment:', paymentError);
  }

  // 4. Update Inventory & Record Stock Movements
  for (const item of orderData.cart) {
    // We fetch the current balance first to accurately deduct (though an RPC would be better in production)
    if (location?.id) {
      const { data: balance } = await supabase
        .from('inventory_balances')
        .select('id, quantity_on_hand')
        .eq('product_id', item.id)
        .eq('location_id', location.id)
        .maybeSingle();

      if (balance) {
        await supabase
          .from('inventory_balances')
          .update({ quantity_on_hand: Number(balance.quantity_on_hand) - item.quantity })
          .eq('id', balance.id);
          
        await supabase.from('stock_movements').insert({
          org_id,
          location_id: location.id,
          product_id: item.id,
          movement_type: 'sale',
          quantity: -item.quantity,
          reference_type: 'order',
          reference_id: order.id,
          notes: 'POS Sale',
        });
      }
    }
  }

  revalidatePath('/pos');
  revalidatePath('/inventory');
  revalidatePath('/orders');
  revalidatePath('/'); // Dashboard

  return { success: true, orderId: order.id, orderNumber };
}
