'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, optAmount, optStr, referenceNumber, str, type ActionState } from '@/lib/action-state';
import { ACTIVE_DELIVERY_STATUSES, CLOSED_ORDER_STATUSES } from '@/lib/enums';
import { formatMoney, labelize } from '@/lib/format';

const NEXT_STEPS = ['', 'out_for_delivery', 'delivered', 'failed', 'cancelled'] as const;
const IN_HAND = ['picked_up', 'out_for_delivery'];

function revalidateDeliveries(orderId?: string) {
  revalidatePath('/deliveries');
  revalidatePath('/riders');
  revalidatePath('/orders', 'layout');
  revalidatePath('/payments');
  revalidatePath('/');
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

async function activeRider(supabase: SupabaseClient, orgId: string, riderId: string) {
  const { data } = await supabase.from('riders').select('id, is_active').eq('id', riderId).eq('org_id', orgId).maybeSingle();
  if (!data?.is_active) throw new Error('Choose an active rider.');
}

/** Same rule as the rider app: back to available once nothing is in hand. */
async function releaseRiderIfFree(supabase: SupabaseClient, riderId: string) {
  const { count } = await supabase
    .from('deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('rider_id', riderId)
    .in('status', IN_HAND);
  if (!count) await supabase.from('riders').update({ status: 'available' }).eq('id', riderId).eq('status', 'on_delivery');
}

/** Sends an order out for delivery, optionally assigning a rider straight away. */
export async function createDelivery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const orderId = str(formData, 'order_id');
    if (!orderId) throw new Error('Choose an order.');
    const riderId = str(formData, 'rider_id');

    const order = check(
      await supabase
        .from('orders')
        .select('id, status, location_id, customer_address_id, delivery_fee, due_total')
        .eq('id', orderId)
        .eq('org_id', user.orgId)
        .maybeSingle()
    ) as any;
    if (!order) throw new Error('Order not found.');
    if (CLOSED_ORDER_STATUSES.includes(order.status)) throw new Error(`This order is ${order.status}.`);

    const { count } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .in('status', ACTIVE_DELIVERY_STATUSES);
    if (count) throw new Error('This order already has an active delivery.');
    if (riderId) await activeRider(supabase, user.orgId, riderId);

    const status = riderId ? 'assigned' : 'pending';
    check(
      await supabase.from('deliveries').insert({
        org_id: user.orgId,
        order_id: orderId,
        rider_id: riderId || null,
        status,
        assigned_at: riderId ? new Date().toISOString() : null,
        pickup_location_id: order.location_id,
        dropoff_address_id: order.customer_address_id,
        delivery_fee: order.delivery_fee,
        cash_to_collect: optAmount(formData, 'cash_to_collect', 'Cash to collect') ?? Number(order.due_total || 0),
        notes: optStr(formData, 'notes'),
      })
    );
    await supabase.from('orders').update({ delivery_status: status }).eq('id', orderId);

    revalidateDeliveries(orderId);
    return riderId ? 'Delivery created and assigned.' : 'Delivery created. Assign a rider when ready.';
  });
}

/** Reassigns the rider and/or moves the delivery on: out for delivery, delivered (with cash), failed, cancelled. */
export async function updateDelivery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const id = str(formData, 'id');
    const next = str(formData, 'next') as (typeof NEXT_STEPS)[number];
    if (!NEXT_STEPS.includes(next)) throw new Error('Choose a valid next step.');

    const delivery = check(
      await supabase
        .from('deliveries')
        .select('*, orders(id, order_number, customer_id, currency_code, due_total)')
        .eq('id', id)
        .eq('org_id', user.orgId)
        .maybeSingle()
    ) as any;
    if (!delivery) throw new Error('Delivery not found.');
    if (!ACTIVE_DELIVERY_STATUSES.includes(delivery.status)) {
      throw new Error(`This delivery is already ${labelize(delivery.status)}.`);
    }
    const order = delivery.orders;
    const now = new Date().toISOString();
    let status: string = delivery.status;
    let riderId: string | null = delivery.rider_id;
    const previousRider = delivery.rider_id;
    let changed = false;

    const chosenRider = str(formData, 'rider_id') || null;
    if (chosenRider !== riderId) {
      if (IN_HAND.includes(status)) throw new Error('The rider can’t be changed after pickup.');
      if (chosenRider) await activeRider(supabase, user.orgId, chosenRider);
      riderId = chosenRider;
      status = riderId ? 'assigned' : 'pending';
      check(
        await supabase
          .from('deliveries')
          .update({ rider_id: riderId, status, assigned_at: riderId ? now : null })
          .eq('id', id)
      );
      await supabase.from('orders').update({ delivery_status: status }).eq('id', order.id);
      changed = true;
    }

    if (next === 'out_for_delivery') {
      if (!riderId) throw new Error('Assign a rider first.');
      if (status !== 'assigned') throw new Error(`The delivery is already ${labelize(status)}.`);
      check(await supabase.from('deliveries').update({ status: 'out_for_delivery', picked_up_at: now }).eq('id', id));
      await supabase.from('orders').update({ status: 'out_for_delivery', delivery_status: 'out_for_delivery' }).eq('id', order.id);
      await supabase.from('riders').update({ status: 'on_delivery' }).eq('id', riderId);
    } else if (next === 'delivered') {
      if (status === 'pending') throw new Error('Assign a rider first.');
      const cash = optAmount(formData, 'cash_collected', 'Cash collected') ?? 0;
      const due = Number(order.due_total || 0);
      if (cash > due + 0.005) throw new Error(`Only ${formatMoney(due)} is due on this order.`);

      check(
        await supabase
          .from('deliveries')
          .update({ status: 'delivered', delivered_at: now, picked_up_at: delivery.picked_up_at || now, cash_collected: cash })
          .eq('id', id)
      );
      await supabase
        .from('orders')
        .update({ status: 'delivered', delivery_status: 'delivered', delivered_at: now })
        .eq('id', order.id);

      if (cash > 0) {
        check(
          await supabase.from('payments').insert({
            org_id: user.orgId,
            order_id: order.id,
            customer_id: order.customer_id,
            payment_number: referenceNumber('COD'),
            method: 'cash',
            amount: cash,
            cash_received: cash,
            currency_code: order.currency_code,
            received_by: user.id,
          })
        );
        if (riderId) {
          check(
            await supabase.from('rider_cash_collections').insert({
              org_id: user.orgId,
              rider_id: riderId,
              delivery_id: id,
              order_id: order.id,
              amount: cash,
            })
          );
          const { data: rider } = await supabase.from('riders').select('cash_on_hand').eq('id', riderId).single();
          await supabase
            .from('riders')
            .update({ cash_on_hand: Number(rider?.cash_on_hand || 0) + cash })
            .eq('id', riderId);
        }
      }
    } else if (next === 'failed') {
      const reason = str(formData, 'reason');
      if (!reason) throw new Error('Enter why the delivery failed.');
      check(await supabase.from('deliveries').update({ status: 'failed', failed_at: now, failure_reason: reason }).eq('id', id));
      await supabase.from('orders').update({ delivery_status: 'failed' }).eq('id', order.id);
    } else if (next === 'cancelled') {
      check(await supabase.from('deliveries').update({ status: 'cancelled', notes: optStr(formData, 'reason') ?? delivery.notes }).eq('id', id));
      await supabase.from('orders').update({ delivery_status: 'cancelled' }).eq('id', order.id);
    } else if (!changed) {
      throw new Error('Nothing to change. Pick a rider or a next step.');
    }

    for (const rider of new Set([riderId, previousRider])) {
      if (rider) await releaseRiderIfFree(supabase, rider);
    }

    revalidateDeliveries(order.id);
    return next ? `Delivery ${labelize(next).toLowerCase()}.` : 'Rider updated.';
  });
}

/** Deletes a delivery record that was created by mistake (not once it's been delivered). */
export async function deleteDelivery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const res = await supabase
      .from('deliveries')
      .delete()
      .eq('id', str(formData, 'id'))
      .eq('org_id', user.orgId)
      .in('status', ['pending', 'assigned', 'cancelled'])
      .select('order_id, rider_id');
    checkAffected(res);
    const row = res.data?.[0];
    if (row?.order_id) {
      const { count } = await supabase
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', row.order_id);
      if (!count) await supabase.from('orders').update({ delivery_status: 'not_required' }).eq('id', row.order_id);
    }
    revalidateDeliveries(row?.order_id);
    return 'Delivery deleted.';
  });
}
