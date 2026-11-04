import { requirePageAccess } from '@/lib/auth';
import { formatDateTime, formatMoney, labelize } from '@/lib/format';
import { expectedCash, openSession } from '@/lib/cash';
import ActionForm from '@/components/admin/ActionForm';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Field, Hidden, TextArea } from '@/components/admin/fields';
import { closeRegister, openRegister, reviewReconciliation } from './actions';

export const revalidate = 0;

export default async function CashPage() {
  const { user, supabase } = await requirePageAccess('/cash');
  const { data: location } = await supabase
    .from('locations')
    .select('id, name')
    .eq('org_id', user.orgId)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  const session = location ? await openSession(supabase, user.orgId, location.id) : null;
  const expected = session ? await expectedCash(supabase, session) : 0;
  const { data: reconciliations } = await supabase
    .from('cash_reconciliations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  const history = reconciliations || [];

  return (
    <section className="px-6 py-5 flex flex-col h-full overflow-y-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Cash Reconciliation</h1>
          <div className="text-sm text-ink-500 mt-1">Open the register with a float, then count the drawer when you close</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">{location?.name || 'No store location'}</h2>
            <span className={`terminal-badge ${session ? 'bg-goodSoft text-good' : 'bg-ink-100 text-ink-500'}`}>
              {session ? 'Register open' : 'Register closed'}
            </span>
          </div>

          {!location ? (
            <div className="text-sm text-ink-500">Add your store location in Settings first.</div>
          ) : session ? (
            <>
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <div className="text-xs text-ink-500 uppercase tracking-wider mb-2">Expected cash in drawer</div>
                  <div className="text-4xl font-bold num tabular tracking-tight3">{formatMoney(expected)}</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Opened</span>
                    <span className="font-medium num tabular">{formatDateTime(session.opened_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Opened by</span>
                    <span className="font-medium">{session.staff?.full_name || user.fullName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Opening float</span>
                    <span className="num tabular font-medium">{formatMoney(session.opening_float)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Cash sales this session</span>
                    <span className="num tabular font-medium text-good">+ {formatMoney(expected - Number(session.opening_float || 0))}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border border-dashed">
                <h3 className="font-medium mb-4">Close register</h3>
                <ActionForm action={closeRegister} submitLabel="Close register & confirm count">
                  <Hidden name="session_id" value={session.id} />
                  <Field label="Actual cash counted (Rs)" name="counted_cash" type="number" step="0.01" min="0" required />
                  <TextArea label="Notes" name="notes" placeholder="Reason for any difference" />
                </ActionForm>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-ink-500 mb-4">
                Open the register before the day’s sales. Cash taken at the POS while it is open is counted toward the drawer.
              </div>
              <ActionForm action={openRegister} submitLabel="Open register">
                <Field label="Opening float (Rs)" name="opening_float" type="number" step="0.01" min="0" defaultValue={0} hint="Cash already in the drawer" />
                <TextArea label="Notes" name="notes" />
              </ActionForm>
            </>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-3">Recent reconciliations</h3>
          <div className="bg-panel border border-border rounded-lg divide-y divide-borderMuted">
            {history.length === 0 && <div className="p-4 text-sm text-ink-500 text-center">No reconciliations yet. One is filed each time you close the register.</div>}
            {history.map((item: any) => {
              const difference = Number(item.difference || 0);
              return (
                <div key={item.id} className="p-4 flex items-center justify-between text-sm gap-4">
                  <div>
                    <div className="font-medium">{formatDateTime(item.submitted_at || item.created_at)}</div>
                    <div className="text-xs text-ink-500">
                      {labelize(item.status)} · expected {formatMoney(item.expected_cash)}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="num tabular font-medium">{formatMoney(item.counted_cash)}</div>
                      <div className={`text-xs font-medium ${difference === 0 ? 'text-good' : difference < 0 ? 'text-bad' : 'text-warn'}`}>
                        {difference === 0 ? 'Exact' : `${difference < 0 ? 'Short' : 'Over'} ${formatMoney(Math.abs(difference))}`}
                      </div>
                    </div>
                    {item.status === 'submitted' && (
                      <div className="flex flex-col items-end gap-1">
                        <ConfirmButton action={reviewReconciliation} fields={{ id: item.id, decision: 'approved' }} className="text-good hover:underline font-medium text-xs">
                          Approve
                        </ConfirmButton>
                        <ConfirmButton action={reviewReconciliation} fields={{ id: item.id, decision: 'rejected' }} confirm="Reject this count?">
                          Reject
                        </ConfirmButton>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
