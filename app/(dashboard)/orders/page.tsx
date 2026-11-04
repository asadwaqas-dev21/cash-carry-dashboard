import Link from 'next/link';
import { requirePageAccess } from '@/lib/auth';
import { formatDateTime, formatMoney, labelize, orderStatusClass } from '@/lib/format';
import { SearchBox, searchPattern } from '@/components/admin/fields';

export const revalidate = 0;

const TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'open', label: 'Open', statuses: ['draft', 'pending', 'confirmed', 'preparing', 'ready'] },
  { key: 'delivery', label: 'Out for Delivery', statuses: ['out_for_delivery'] },
  { key: 'unpaid', label: 'Unpaid', statuses: null },
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { q = '', tab = 'all' } = await searchParams;
  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const { supabase } = await requirePageAccess('/orders');

  let query = supabase
    .from('orders')
    .select('*, customers(display_name, type), customer_addresses(city)', { count: 'exact' })
    .order('placed_at', { ascending: false })
    .limit(100);
  if (active.statuses) query = query.in('status', active.statuses as unknown as string[]);
  if (active.key === 'unpaid') query = query.gt('due_total', 0).not('status', 'in', '(cancelled,voided,refunded)');
  if (q.trim()) query = query.ilike('order_number', searchPattern(q));

  const [{ data: orders, count: shownCount }, { count: openCount }, { count: deliveryCount }, { count: unpaidCount }] =
    await Promise.all([
      query,
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', TABS[1].statuses as unknown as string[]),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'out_for_delivery'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gt('due_total', 0).not('status', 'in', '(cancelled,voided,refunded)'),
    ]);
  const counts: Record<string, number | null> = { open: openCount, delivery: deliveryCount, unpaid: unpaidCount };
  const ordersList = orders || [];

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Orders</h1>
          <div className="text-sm text-ink-500 mt-1">POS sales and app orders. Open an order to update it, take payment or send it out.</div>
        </div>
        <SearchBox placeholder="Search order number" defaultValue={q} />
      </div>

      <div className="flex items-center gap-1 p-1 bg-canvas border border-border rounded-md mb-4 w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'all' ? '/orders' : `/orders?tab=${t.key}`}
            className={`px-3 py-1.5 text-sm rounded font-medium ${t.key === active.key ? 'bg-white shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}
          >
            {t.label}
            {counts[t.key] != null && (
              <span className="ml-1 bg-ink-200 text-ink-700 text-2xs px-1.5 rounded-full num tabular">{counts[t.key]}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Order</th>
                <th className="text-left font-medium py-3">Date & Time</th>
                <th className="text-left font-medium py-3">Customer</th>
                <th className="text-left font-medium py-3">Source</th>
                <th className="text-right font-medium py-3">Amount</th>
                <th className="text-left font-medium px-5 py-3">Payment</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {ordersList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-500">
                    {q ? `No orders match “${q}”.` : 'No orders here yet. Sales from the POS and the customer app appear here.'}
                  </td>
                </tr>
              )}
              {ordersList.map((order: any) => (
                <tr key={order.id} className="hover:bg-canvas transition">
                  <td className="px-5 py-4 num text-xs">
                    <Link href={`/orders/${order.id}`} className="text-brand font-medium hover:underline">#{order.order_number}</Link>
                  </td>
                  <td className="py-4 text-xs text-ink-500 num tabular">{formatDateTime(order.placed_at)}</td>
                  <td className="py-4">
                    <div className="text-sm font-medium">{order.customers?.display_name || 'Walk-in customer'}</div>
                    <div className="text-2xs text-ink-400">{order.customer_addresses?.city || labelize(order.customers?.type || 'walk_in')}</div>
                  </td>
                  <td className="py-4"><span className="terminal-badge bg-ink-100 text-ink-700">{labelize(order.channel)}</span></td>
                  <td className="py-4 text-right num tabular font-medium">{formatMoney(order.grand_total)}</td>
                  <td className="px-5 py-4 text-xs">
                    <span className={Number(order.due_total) > 0 ? 'text-warn font-medium' : 'text-ink-500'}>
                      {Number(order.due_total) > 0 ? `${formatMoney(order.due_total)} due` : labelize(order.payment_status)}
                    </span>
                  </td>
                  <td className="px-5 py-4"><span className={`terminal-badge ${orderStatusClass(order.status)}`}>{labelize(order.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border text-xs text-ink-500 bg-canvas/50">
          Showing <span className="font-medium text-ink-900 num tabular">{ordersList.length}</span> of{' '}
          <span className="font-medium text-ink-900 num tabular">{shownCount || 0}</span> orders.
        </div>
      </div>
    </section>
  );
}
