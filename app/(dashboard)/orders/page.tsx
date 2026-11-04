import { supabase } from '@/lib/supabase';
import { formatDateTime, formatMoney, labelize } from '@/lib/format';

export const revalidate = 0;

function statusClass(status: string) {
  if (['delivered', 'completed', 'paid'].includes(status)) return 'bg-goodSoft text-good';
  if (['out_for_delivery', 'preparing', 'pending', 'confirmed'].includes(status)) return 'bg-warnSoft text-warn';
  if (['cancelled', 'voided', 'failed', 'refunded'].includes(status)) return 'bg-badSoft text-bad';
  return 'bg-ink-100 text-ink-600';
}

export default async function OrdersPage() {
  const [{ data: orders }, { count: totalCount }, { count: pendingCount }, { count: deliveryCount }] =
    await Promise.all([
      supabase
        .from('orders')
        .select('*, customers(display_name, type), customer_addresses(city)')
        .order('placed_at', { ascending: false })
        .limit(50),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'pending', 'confirmed', 'preparing']),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('delivery_status', 'out_for_delivery'),
    ]);

  const ordersList = orders || [];

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Orders</h1>
          <div className="text-sm text-ink-500 mt-1">Live orders from Supabase</div>
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-2 text-ink-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search order ID or customer" className="pl-8 pr-3 h-8 w-64 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-canvas border border-border rounded-md mb-4 w-fit">
        <div className="px-3 py-1.5 text-sm rounded bg-white shadow-sm font-medium">All <span className="ml-1 text-2xs num text-ink-500">{totalCount || 0}</span></div>
        <div className="px-3 py-1.5 text-sm rounded text-ink-500 font-medium">Pending <span className="ml-1 bg-ink-200 text-ink-700 text-2xs px-1.5 rounded-full num tabular">{pendingCount || 0}</span></div>
        <div className="px-3 py-1.5 text-sm rounded text-ink-500 font-medium">Out for Delivery <span className="ml-1 bg-ink-200 text-ink-700 text-2xs px-1.5 rounded-full num tabular">{deliveryCount || 0}</span></div>
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Order ID</th>
                <th className="text-left font-medium py-3">Date & Time</th>
                <th className="text-left font-medium py-3">Customer</th>
                <th className="text-left font-medium py-3">Source</th>
                <th className="text-right font-medium py-3">Amount</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {ordersList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-500">
                    No orders found in Supabase.
                  </td>
                </tr>
              )}
              {ordersList.map((order: any) => {
                const customerName = order.customers?.display_name || 'Walk-in customer';
                return (
                  <tr key={order.id} className="hover:bg-canvas transition cursor-pointer">
                    <td className="px-5 py-4 num text-xs">#{order.order_number}</td>
                    <td className="py-4 text-xs text-ink-500 num tabular">{formatDateTime(order.placed_at)}</td>
                    <td className="py-4">
                      <div className="text-sm font-medium">{customerName}</div>
                      <div className="text-2xs text-ink-400">{order.customer_addresses?.city || labelize(order.customers?.type)}</div>
                    </td>
                    <td className="py-4"><span className="terminal-badge bg-ink-100 text-ink-700">{labelize(order.channel)}</span></td>
                    <td className="py-4 text-right num tabular font-medium">{formatMoney(order.grand_total, order.currency_code || 'Rs')}</td>
                    <td className="px-5 py-4"><span className={`terminal-badge ${statusClass(order.status)}`}>{labelize(order.status)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border text-xs text-ink-500 bg-canvas/50">
          Showing <span className="font-medium text-ink-900 num tabular">{ordersList.length}</span> of <span className="font-medium text-ink-900 num tabular">{totalCount || 0}</span> real orders.
        </div>
      </div>
    </section>
  );
}
