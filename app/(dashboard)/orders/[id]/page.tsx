import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageAccess } from '@/lib/auth';
import { formatDateTime, formatMoney, formatNumber, labelize, orderStatusClass } from '@/lib/format';
import { ACTIVE_DELIVERY_STATUSES, CLOSED_ORDER_STATUSES, ORDER_STATUSES } from '@/lib/enums';
import FormModal from '@/components/admin/FormModal';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Hidden, Select, TextArea, enumOptions, triggerPrimary, triggerSecondary } from '@/components/admin/fields';
import { updateOrderStatus } from '../actions';
import { recordPayment, voidPayment } from '../../payments/actions';
import { createDelivery, updateDelivery } from '../../deliveries/actions';
import PaymentFields from '../../payments/PaymentFields';
import { NewDeliveryFields, UpdateDeliveryFields } from '../../deliveries/DeliveryFields';

export const revalidate = 0;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requirePageAccess('/orders');
  const isOwner = user.role === 'owner';

  const [{ data: order }, { data: riders }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        '*, customers(display_name, phone, type), customer_addresses(address_line1, city), order_items(*), payments(*), deliveries(*, riders(full_name, rider_code)), order_status_history(*)'
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('riders').select('id, full_name, rider_code, status').eq('is_active', true).order('full_name'),
  ]);
  if (!order) notFound();

  const closed = CLOSED_ORDER_STATUSES.includes(order.status);
  const due = Number(order.due_total || 0);
  const items = order.order_items || [];
  const payments = [...(order.payments || [])].sort((a: any, b: any) => b.paid_at.localeCompare(a.paid_at));
  const deliveries = [...(order.deliveries || [])].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
  const activeDelivery = deliveries.find((d: any) => ACTIVE_DELIVERY_STATUSES.includes(d.status));
  const history = [...(order.order_status_history || [])].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
  // Sales staff can't cancel; owners can.
  const statusOptions = ORDER_STATUSES.filter((s) => s !== order.status && (isOwner || s !== 'cancelled'));

  return (
    <section className="px-6 py-5 flex flex-col h-full overflow-y-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="w-8 h-8 rounded-full hover:bg-ink-200/50 flex items-center justify-center text-ink-500 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight2">Order #{order.order_number}</h1>
              <span className={`terminal-badge ${orderStatusClass(order.status)}`}>{labelize(order.status)}</span>
            </div>
            <div className="text-sm text-ink-500 mt-1">
              {labelize(order.channel)} · {formatDateTime(order.placed_at)} · {order.customers?.display_name || 'Walk-in customer'}
              {order.customers?.phone ? ` · ${order.customers.phone}` : ''}
            </div>
          </div>
        </div>

        {!closed && (
          <div className="flex items-center gap-2 shrink-0">
            {due > 0 && (
              <FormModal action={recordPayment} title="Record payment" description={`${formatMoney(due)} due`} trigger="Record payment" triggerClassName={triggerSecondary}>
                <PaymentFields order={order} />
              </FormModal>
            )}
            {isOwner && !activeDelivery && (
              <FormModal action={createDelivery} title="Send for delivery" trigger="Send for delivery" triggerClassName={triggerSecondary}>
                <NewDeliveryFields order={order} riders={riders || []} />
              </FormModal>
            )}
            <FormModal action={updateOrderStatus} title="Change status" trigger="Change status" triggerClassName={triggerPrimary} submitLabel="Update status">
              <Hidden name="id" value={order.id} />
              <Select label="New status" name="status" required options={enumOptions(statusOptions)} defaultValue={statusOptions[0]} />
              <TextArea label="Note" name="notes" placeholder="Reason, especially when cancelling" />
              {isOwner && <div className="text-2xs text-ink-400">Cancelling returns the order’s items to stock and stops open deliveries.</div>}
            </FormModal>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-panel border border-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-border text-sm font-semibold">Items</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-borderMuted">
                {items.length === 0 && <tr><td className="px-5 py-6 text-center text-ink-500">No items on this order.</td></tr>}
                {items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-2xs text-ink-400">{item.sku || ''}</div>
                    </td>
                    <td className="py-3 text-right num tabular text-ink-500">{formatNumber(item.quantity)} × {formatMoney(item.unit_price)}</td>
                    <td className="py-3 text-right num tabular text-ink-400 text-xs">{Number(item.tax_rate) > 0 ? `+${item.tax_rate}% tax` : ''}</td>
                    <td className="px-5 py-3 text-right num tabular font-medium">{formatMoney(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-border text-sm space-y-1">
              <div className="flex justify-between text-ink-500"><span>Subtotal</span><span className="num tabular">{formatMoney(order.subtotal)}</span></div>
              {Number(order.discount_total) > 0 && <div className="flex justify-between text-ink-500"><span>Discount</span><span className="num tabular">−{formatMoney(order.discount_total)}</span></div>}
              {Number(order.tax_total) > 0 && <div className="flex justify-between text-ink-500"><span>Tax</span><span className="num tabular">{formatMoney(order.tax_total)}</span></div>}
              {Number(order.delivery_fee) > 0 && <div className="flex justify-between text-ink-500"><span>Delivery fee</span><span className="num tabular">{formatMoney(order.delivery_fee)}</span></div>}
              <div className="flex justify-between font-semibold pt-1"><span>Total</span><span className="num tabular">{formatMoney(order.grand_total)}</span></div>
              <div className="flex justify-between text-ink-500"><span>Paid</span><span className="num tabular">{formatMoney(order.paid_total)}</span></div>
              <div className={`flex justify-between font-medium ${due > 0 ? 'text-warn' : 'text-good'}`}><span>Due</span><span className="num tabular">{formatMoney(due)}</span></div>
            </div>
          </div>

          <div className="bg-panel border border-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-border text-sm font-semibold">Payments</div>
            <div className="divide-y divide-borderMuted">
              {payments.length === 0 && <div className="px-5 py-6 text-sm text-center text-ink-500">No payments yet.</div>}
              {payments.map((p: any) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{labelize(p.method)} · <span className="num text-xs text-ink-500">{p.payment_number}</span></div>
                    <div className="text-2xs text-ink-400">{formatDateTime(p.paid_at)}{p.provider_reference ? ` · Ref ${p.provider_reference}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`num tabular font-medium ${p.status === 'paid' ? '' : 'line-through text-ink-400'}`}>{formatMoney(p.amount)}</span>
                    {p.status !== 'paid' && <span className="terminal-badge bg-ink-100 text-ink-500">{labelize(p.status)}</span>}
                    {isOwner && p.status === 'paid' && (
                      <ConfirmButton action={voidPayment} fields={{ id: p.id }} confirm={`Void this ${formatMoney(p.amount)} payment? The order will show it as unpaid again.`}>
                        Void
                      </ConfirmButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-border text-sm font-semibold">Delivery</div>
            <div className="p-5 text-sm space-y-3">
              {order.customer_addresses && (
                <div className="text-ink-500 text-xs">{order.customer_addresses.address_line1}, {order.customer_addresses.city}</div>
              )}
              {deliveries.length === 0 && <div className="text-ink-500">Not sent for delivery.</div>}
              {deliveries.map((d: any) => (
                <div key={d.id} className="border border-borderMuted rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{d.riders?.full_name || 'Unassigned'}</span>
                    <span className={`terminal-badge ${orderStatusClass(d.status)}`}>{labelize(d.status)}</span>
                  </div>
                  <div className="text-2xs text-ink-400 mt-1">
                    Collect {formatMoney(d.cash_to_collect)}
                    {Number(d.cash_collected) > 0 ? ` · collected ${formatMoney(d.cash_collected)}` : ''}
                    {d.failure_reason ? ` · ${d.failure_reason}` : ''}
                  </div>
                  {isOwner && ACTIVE_DELIVERY_STATUSES.includes(d.status) && (
                    <div className="mt-2">
                      <FormModal action={updateDelivery} title="Update delivery" trigger="Update delivery" triggerClassName="text-brand hover:underline font-medium text-xs">
                        <UpdateDeliveryFields delivery={d} riders={riders || []} />
                      </FormModal>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-border rounded-lg">
            <div className="px-5 py-3.5 border-b border-border text-sm font-semibold">History</div>
            <div className="p-5 space-y-3 text-xs">
              {history.map((h: any) => (
                <div key={h.id}>
                  <div className="font-medium">{h.old_status ? `${labelize(h.old_status)} → ` : ''}{labelize(h.new_status)}</div>
                  <div className="text-ink-400">{formatDateTime(h.created_at)}{h.notes ? ` · ${h.notes}` : ''}</div>
                </div>
              ))}
              <div>
                <div className="font-medium">Placed</div>
                <div className="text-ink-400">{formatDateTime(order.placed_at)}</div>
              </div>
              {order.cancelled_reason && <div className="text-bad">Cancelled: {order.cancelled_reason}</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
