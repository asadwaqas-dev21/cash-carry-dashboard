import { supabase } from '@/lib/supabase';
import { formatDateTime, formatMoney, labelize, startOfTodayIso, sumBy } from '@/lib/format';

export const revalidate = 0;

function methodClass(method: string) {
  if (method === 'cash') return 'bg-goodSoft text-good border border-good/20';
  if (method === 'card') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (method === 'credit') return 'bg-warnSoft text-warn border border-warn/20';
  return 'bg-ink-100 text-ink-600 border border-border';
}

export default async function PaymentsPage() {
  const today = startOfTodayIso();
  const [{ data: payments }, { data: todayPayments }, { data: creditOrders }] = await Promise.all([
    supabase.from('payments').select('*, orders(order_number)').order('paid_at', { ascending: false }).limit(100),
    supabase.from('payments').select('method, amount, currency_code').gte('paid_at', today),
    supabase.from('orders').select('due_total').gt('due_total', 0),
  ]);

  const list = payments || [];
  const todayList = todayPayments || [];
  const currency = todayList[0]?.currency_code || list[0]?.currency_code || 'Rs';
  const metrics = [
    ['Total Collected Today', sumBy(todayList, (payment: any) => payment.amount)],
    ['Cash Payments', sumBy(todayList.filter((payment: any) => payment.method === 'cash'), (payment: any) => payment.amount)],
    ['Card Payments', sumBy(todayList.filter((payment: any) => payment.method === 'card'), (payment: any) => payment.amount)],
    ['Pending / Credit', sumBy(creditOrders || [], (order: any) => order.due_total)],
  ];

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Payments Ledger</h1>
          <div className="text-sm text-ink-500 mt-1">Real transaction history across payment methods</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {metrics.map(([metric, value]) => (
          <div key={metric} className="bg-panel border border-border rounded-lg p-5">
            <div className="text-sm text-ink-500 font-medium mb-1">{metric}</div>
            <div className="text-2xl font-semibold num tabular text-ink-900">{formatMoney(value as number, currency)}</div>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Txn ID</th>
                <th className="text-left font-medium py-3">Time</th>
                <th className="text-left font-medium py-3">Order Ref</th>
                <th className="text-left font-medium py-3">Method</th>
                <th className="text-right font-medium px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-500">No payments found in Supabase.</td>
                </tr>
              )}
              {list.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-canvas transition cursor-pointer">
                  <td className="px-5 py-3 text-xs num tabular text-ink-500">{payment.payment_number || payment.id.slice(0, 8)}</td>
                  <td className="py-3 text-xs num tabular text-ink-500">{formatDateTime(payment.paid_at)}</td>
                  <td className="py-3 text-brand text-xs font-medium">{payment.orders?.order_number ? `#${payment.orders.order_number}` : '-'}</td>
                  <td className="py-3"><span className={`terminal-badge ${methodClass(payment.method)}`}>{labelize(payment.method)}</span></td>
                  <td className="px-5 py-3 text-right num tabular font-medium">{formatMoney(payment.amount, payment.currency_code || currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
