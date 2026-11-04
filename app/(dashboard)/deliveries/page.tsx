import Link from 'next/link';
import { requirePageAccess } from '@/lib/auth';
import { formatDateTime, formatMoney, initials, labelize, orderStatusClass, startOfDaysAgoIso } from '@/lib/format';
import { ACTIVE_DELIVERY_STATUSES } from '@/lib/enums';
import FormModal from '@/components/admin/FormModal';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { PlusIcon, triggerLink } from '@/components/admin/fields';
import { createDelivery, deleteDelivery, updateDelivery } from './actions';
import { NewDeliveryFields, UpdateDeliveryFields } from './DeliveryFields';

export const revalidate = 0;

export default async function DeliveriesPage() {
  const { user, supabase } = await requirePageAccess('/deliveries');
  const isOwner = user.role === 'owner';

  const [{ data: deliveries }, { data: riders }, { data: candidateOrders }] = await Promise.all([
    supabase
      .from('deliveries')
      .select('*, orders(id, order_number, grand_total, customer_addresses(city, address_line1), customers(display_name)), riders(full_name, rider_code, status)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('riders').select('id, full_name, rider_code, status').eq('is_active', true).order('full_name'),
    // Open orders from the last 30 days that aren't already out with a rider.
    supabase
      .from('orders')
      .select('id, order_number, grand_total, due_total, customers(display_name)')
      .not('status', 'in', '(cancelled,voided,refunded,delivered,completed)')
      .in('delivery_status', ['not_required', 'failed', 'cancelled'])
      .gte('placed_at', startOfDaysAgoIso(30))
      .order('placed_at', { ascending: false })
      .limit(100),
  ]);

  const list = deliveries || [];
  const active = list.filter((delivery: any) => ACTIVE_DELIVERY_STATUSES.includes(delivery.status));

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Deliveries</h1>
          <div className="text-sm text-ink-500 mt-1">Assign riders and track every trip. Riders update their trips from the rider app.</div>
        </div>
        {isOwner && (
          <FormModal action={createDelivery} title="New delivery" trigger={<><PlusIcon /> New Delivery</>} submitLabel="Create delivery">
            <NewDeliveryFields orders={candidateOrders || []} riders={riders || []} />
          </FormModal>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="col-span-1 flex flex-col bg-panel border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-canvas/30">
            <h3 className="text-sm font-semibold">Active Trips</h3>
            <span className="bg-brand-softer text-brand text-xs px-2 py-0.5 rounded-full font-medium num tabular">{active.length} live</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {active.length === 0 && <div className="text-sm text-ink-500 p-4 text-center">No active deliveries.</div>}
            {active.map((delivery: any) => (
              <div key={delivery.id} className="border border-border rounded-lg p-3 bg-brand-softer/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center">{initials(delivery.riders?.full_name || '?')}</div>
                    <div className="text-sm font-medium">{delivery.riders?.full_name || 'Unassigned'}</div>
                  </div>
                  <div className="text-xs font-semibold text-brand">{labelize(delivery.status)}</div>
                </div>
                <Link href={`/orders/${delivery.orders?.id}`} className="text-xs text-brand hover:underline">Order #{delivery.orders?.order_number || '-'}</Link>
                <div className="text-xs text-ink-400">{delivery.orders?.customers?.display_name || 'Walk-in customer'}</div>
                <div className="text-xs text-ink-400">
                  {[delivery.orders?.customer_addresses?.address_line1, delivery.orders?.customer_addresses?.city].filter(Boolean).join(', ') || 'No address'}
                </div>
                <div className="text-xs text-ink-500 mt-1">Collect {formatMoney(delivery.cash_to_collect)}</div>
                {isOwner && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-borderMuted">
                    <FormModal action={updateDelivery} title={`Update delivery · #${delivery.orders?.order_number || ''}`} trigger="Update" triggerClassName={triggerLink}>
                      <UpdateDeliveryFields delivery={delivery} riders={riders || []} />
                    </FormModal>
                    {['pending', 'assigned'].includes(delivery.status) && (
                      <ConfirmButton action={deleteDelivery} fields={{ id: delivery.id }} confirm="Delete this delivery? Use it only for deliveries created by mistake.">
                        Delete
                      </ConfirmButton>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-panel border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Delivery Ledger</h3>
            <span className="text-xs text-ink-400 num tabular">{list.length} records</span>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
                <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                  <th className="text-left font-medium px-5 py-3">Order</th>
                  <th className="text-left font-medium py-3">Rider</th>
                  <th className="text-left font-medium py-3">Assigned</th>
                  <th className="text-right font-medium py-3">Cash</th>
                  <th className="text-right font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderMuted">
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-500">No deliveries yet.</td>
                  </tr>
                )}
                {list.map((delivery: any) => (
                  <tr key={delivery.id} className="hover:bg-canvas transition">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${delivery.orders?.id}`} className="font-medium hover:text-brand">#{delivery.orders?.order_number || '-'}</Link>
                      <div className="text-2xs text-ink-400">{delivery.orders?.customers?.display_name || 'Walk-in customer'}</div>
                    </td>
                    <td className="py-3 text-ink-700">{delivery.riders?.full_name || 'Unassigned'}</td>
                    <td className="py-3 text-xs text-ink-500 num tabular">{formatDateTime(delivery.assigned_at || delivery.created_at)}</td>
                    <td className="py-3 text-right num tabular">
                      {delivery.status === 'delivered' ? formatMoney(delivery.cash_collected) : formatMoney(delivery.cash_to_collect)}
                      <div className="text-2xs text-ink-400">{delivery.status === 'delivered' ? 'collected' : 'to collect'}</div>
                    </td>
                    <td className="px-5 py-3 text-right"><span className={`terminal-badge ${orderStatusClass(delivery.status)}`}>{labelize(delivery.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
