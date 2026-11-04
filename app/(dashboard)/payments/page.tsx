import Link from 'next/link';
import { requirePageAccess } from '@/lib/auth';
import { formatDateTime, formatMoney, labelize, startOfTodayIso, sumBy } from '@/lib/format';
import FormModal from '@/components/admin/FormModal';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { PlusIcon } from '@/components/admin/fields';
import { recordPayment, voidPayment } from './actions';
import PaymentFields from './PaymentFields';

export const revalidate = 0;

function methodClass(method: string) {
  if (method === 'cash') return 'bg-goodSoft text-good border border-good/20';
  if (method === 'card') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (method === 'credit') return 'bg-warnSoft text-warn border border-warn/20';
  return 'bg-ink-100 text-ink-600 border border-border';
}

export default async function PaymentsPage() {
  const { supabase } = await requirePageAccess('/payments');
  const today = startOfTodayIso();
  const [{ data: payments }, { data: todayPayments }, { data: dueOrders }] = await Promise.all([
    supabase.from('payments').select('*, orders(id, order_number)').order('paid_at', { ascending: false }).limit(100),
    supabase.from('payments').select('method, amount').eq('status', 'paid').gte('paid_at', today),
    supabase
      .from('orders')
      .select('id, order_number, due_total, customers(display_name)')
      .gt('due_total', 0)
      .not('status', 'in', '(cancelled,voided,refunded)')
      .order('placed_at', { ascending: false }),
  ]);

  const list = payments || [];
  const todayList = todayPayments || [];
  const metrics: [string, number][] = [
    ['Total Collected Today', sumBy(todayList, (payment: any) => payment.amount)],
    ['Cash Payments', sumBy(todayList.filter((payment: any) => payment.method === 'cash'), (payment: any) => payment.amount)],
    ['Card Payments', sumBy(todayList.filter((payment: any) => payment.method === 'card'), (payment: any) => payment.amount)],
    ['Unpaid Balances', sumBy(dueOrders || [], (order: any) => order.due_total)],
  ];

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Payments Ledger</h1>
          <div className="text-sm text-ink-500 mt-1">Every payment across POS, app orders and cash on delivery</div>
        </div>
        <FormModal action={recordPayment} title="Record payment" trigger={<><PlusIcon /> Record Payment</>} submitLabel="Record payment">
          <PaymentFields orders={dueOrders || []} />
        </FormModal>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {metrics.map(([metric, value]) => (
          <div key={metric} className="bg-panel border border-border rounded-lg p-5">
            <div className="text-sm text-ink-500 font-medium mb-1">{metric}</div>
            <div className="text-2xl font-semibold num tabular text-ink-900">{formatMoney(value)}</div>
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
                <th className="text-right font-medium py-3">Amount</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-500">No payments yet.</td>
                </tr>
              )}
              {list.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-canvas transition">
                  <td className="px-5 py-3 text-xs num tabular text-ink-500">{payment.payment_number || payment.id.slice(0, 8)}</td>
                  <td className="py-3 text-xs num tabular text-ink-500">{formatDateTime(payment.paid_at)}</td>
                  <td className="py-3 text-xs font-medium">
                    {payment.orders ? (
                      <Link href={`/orders/${payment.orders.id}`} className="text-brand hover:underline">#{payment.orders.order_number}</Link>
                    ) : '-'}
                  </td>
                  <td className="py-3"><span className={`terminal-badge ${methodClass(payment.method)}`}>{labelize(payment.method)}</span></td>
                  <td className={`py-3 text-right num tabular font-medium ${payment.status === 'paid' ? '' : 'line-through text-ink-400'}`}>
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {payment.status === 'paid' ? (
                      <ConfirmButton action={voidPayment} fields={{ id: payment.id }} confirm={`Void this ${formatMoney(payment.amount)} payment? Its order will show the amount as due again.`}>
                        Void
                      </ConfirmButton>
                    ) : (
                      <span className="terminal-badge bg-ink-100 text-ink-500">{labelize(payment.status)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
