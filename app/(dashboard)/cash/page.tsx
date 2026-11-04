import { supabase } from '@/lib/supabase';
import { formatDateTime, formatMoney, labelize, startOfTodayIso, sumBy } from '@/lib/format';

export const revalidate = 0;

export default async function CashPage() {
  const today = startOfTodayIso();
  const [{ data: openSessions }, { data: cashPayments }, { data: reconciliations }] = await Promise.all([
    supabase.from('pos_sessions').select('*, staff(full_name), locations(name)').eq('status', 'open').order('opened_at', { ascending: false }).limit(1),
    supabase.from('payments').select('amount').eq('method', 'cash').gte('paid_at', today),
    supabase.from('cash_reconciliations').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  const session = openSessions?.[0];
  const cashSales = sumBy(cashPayments || [], (payment: any) => payment.amount);
  const expectedCash = Number(session?.expected_cash || session?.opening_float || 0) + cashSales;
  const history = reconciliations || [];

  return (
    <section className="px-6 py-5 flex flex-col h-full overflow-y-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Cash Reconciliation</h1>
          <div className="text-sm text-ink-500 mt-1">Till balancing from real POS sessions and cash payments</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">{session?.locations?.name || 'No open register session'}</h2>
            <span className={`terminal-badge ${session ? 'bg-goodSoft text-good' : 'bg-ink-100 text-ink-500'}`}>
              {session ? 'Session Open' : 'Closed'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <div className="text-xs text-ink-500 uppercase tracking-wider mb-2">Expected Cash in Drawer</div>
              <div className="text-4xl font-bold num tabular tracking-tight3">{formatMoney(expectedCash)}</div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Opened By</span>
                <span className="font-medium">{session?.staff?.full_name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Opening Float</span>
                <span className="num tabular font-medium">{formatMoney(session?.opening_float || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-500">Cash Sales Today</span>
                <span className="num tabular font-medium text-good">+ {formatMoney(cashSales)}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border border-dashed">
            <h3 className="font-medium mb-4">Perform Reconciliation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5">Actual Cash Counted</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-ink-400 font-mono text-sm">Rs</span>
                  <input type="text" disabled={!session} className="w-full pl-12 pr-4 py-2 bg-canvas border border-border rounded-md font-mono text-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5">Notes</label>
                <textarea disabled={!session} className="w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand disabled:opacity-50" rows={2} placeholder={session ? 'Add reason for discrepancy if any...' : 'Open a POS session before reconciling.'}></textarea>
              </div>
              <button disabled={!session} className="w-full py-3 bg-ink-900 text-white rounded-md font-medium hover:bg-ink-700 transition disabled:opacity-50">
                Close Register & Confirm Count
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Recent Reconciliations</h3>
          <div className="bg-panel border border-border rounded-lg divide-y divide-borderMuted">
            {history.length === 0 && <div className="p-4 text-sm text-ink-500 text-center">No cash reconciliations found in Supabase.</div>}
            {history.map((item: any) => (
              <div key={item.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{formatDateTime(item.submitted_at || item.created_at)}</div>
                  <div className="text-xs text-ink-500">{labelize(item.status)}</div>
                </div>
                <div className="text-right">
                  <div className="num tabular font-medium">{formatMoney(item.counted_cash)}</div>
                  <div className={`text-xs font-medium ${Number(item.difference || 0) === 0 ? 'text-good' : Number(item.difference || 0) < 0 ? 'text-warn' : 'text-brand'}`}>
                    Difference {formatMoney(item.difference)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
