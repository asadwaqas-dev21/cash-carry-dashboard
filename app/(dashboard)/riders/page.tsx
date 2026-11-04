import { requirePageAccess } from '@/lib/auth';
import { formatMoney, initials, labelize, startOfTodayIso } from '@/lib/format';
import { RIDER_STATUSES } from '@/lib/enums';
import FormModal from '@/components/admin/FormModal';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Field, Hidden, PlusIcon, Row, Select, enumOptions, triggerLink } from '@/components/admin/fields';
import { deleteRider, receiveRiderCash, saveRider, setRiderPassword } from './actions';
import { hasAdminKey } from '@/lib/supabase-admin';

export const revalidate = 0;

function RiderFields({ rider }: { rider?: any }) {
  return (
    <>
      <Hidden name="id" value={rider?.id} />
      <Field label="Full name" name="full_name" required defaultValue={rider?.full_name} />
      <Row>
        <Field label="Rider code" name="rider_code" defaultValue={rider?.rider_code} placeholder="Auto, e.g. R-001" />
        <Field label="Phone" name="phone" type="tel" defaultValue={rider?.phone} />
      </Row>
      <Field label="Email" name="email" type="email" defaultValue={rider?.email} hint="Their rider app login. Then use “App password” to set the password." />
      <Row>
        <Field label="Vehicle type" name="vehicle_type" defaultValue={rider?.vehicle_type} placeholder="e.g. Motorbike" />
        <Field label="Vehicle number" name="vehicle_number" defaultValue={rider?.vehicle_number} />
      </Row>
      <Row>
        <Select label="Status" name="status" options={enumOptions(RIDER_STATUSES)} defaultValue={rider?.status || 'off_shift'} />
        <Select
          label="Active"
          name="is_active"
          options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No (can’t get deliveries)' }]}
          defaultValue={rider ? String(rider.is_active) : 'true'}
        />
      </Row>
    </>
  );
}

function statusClass(status: string) {
  if (status === 'available') return 'bg-goodSoft text-good';
  if (status === 'on_delivery') return 'bg-brand-soft text-brand';
  return 'bg-ink-100 text-ink-500';
}

export default async function RidersPage() {
  const { supabase } = await requirePageAccess('/riders');
  const [{ data: riders }, { data: todayDeliveries }] = await Promise.all([
    supabase.from('riders').select('*').order('full_name'),
    supabase.from('deliveries').select('rider_id, status').not('rider_id', 'is', null).gte('created_at', startOfTodayIso()),
  ]);

  const stats: Record<string, { trips: number; delivered: number; failed: number }> = {};
  for (const d of todayDeliveries || []) {
    const s = (stats[d.rider_id] ||= { trips: 0, delivered: 0, failed: 0 });
    s.trips++;
    if (d.status === 'delivered') s.delivered++;
    if (d.status === 'failed') s.failed++;
  }

  const ridersList = riders || [];
  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Riders & Fleet</h1>
          <div className="text-sm text-ink-500 mt-1">Manage delivery riders, vehicles and the cash they carry</div>
        </div>
        <FormModal action={saveRider} title="Add rider" trigger={<><PlusIcon /> Add Rider</>} submitLabel="Add rider">
          <RiderFields />
        </FormModal>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {ridersList.length === 0 && (
          <div className="col-span-4 p-8 text-center text-ink-500 bg-panel border border-border rounded-lg">
            No riders yet. Use “Add Rider” to create one.
          </div>
        )}
        {ridersList.map((rider: any) => {
          const s = stats[rider.id] || { trips: 0, delivered: 0, failed: 0 };
          const cash = Number(rider.cash_on_hand || 0);
          return (
            <div key={rider.id} className={`bg-panel border border-border rounded-lg p-5 flex flex-col ${rider.is_active ? '' : 'opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-soft text-brand text-sm font-semibold flex items-center justify-center">
                  {initials(rider.full_name)}
                </div>
                <span className={`terminal-badge ${statusClass(rider.status)}`}>
                  {rider.status === 'on_delivery' && <span className="pulse-dot"><span className="block w-1.5 h-1.5 rounded-full bg-brand"></span></span>}
                  {labelize(rider.status)}
                </span>
              </div>
              <div className="font-semibold text-lg">{rider.full_name}</div>
              <div className="text-xs text-ink-400 num tabular">{rider.rider_code}{rider.phone ? ` · ${rider.phone}` : ''}</div>
              <div className="text-xs text-ink-400 mb-4">{[rider.vehicle_type, rider.vehicle_number].filter(Boolean).join(' · ') || 'No vehicle set'}</div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-borderMuted">
                <div>
                  <div className="text-2xs text-ink-400 uppercase tracking-wider mb-0.5">Trips today</div>
                  <div className="font-semibold num tabular">{s.trips}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-400 uppercase tracking-wider mb-0.5">Delivered</div>
                  <div className="font-semibold num tabular text-good">{s.delivered}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-400 uppercase tracking-wider mb-0.5">Failed</div>
                  <div className={`font-semibold num tabular ${s.failed ? 'text-bad' : ''}`}>{s.failed}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-borderMuted text-sm">
                <span className="text-ink-500 text-xs">Cash on hand</span>
                <span className={`num tabular font-semibold ${cash > 0 ? 'text-warn' : ''}`}>{formatMoney(cash)}</span>
              </div>

              <div className="flex items-center gap-3 pt-3 mt-auto">
                <FormModal action={saveRider} title="Edit rider" trigger="Edit" triggerClassName={triggerLink}>
                  <RiderFields rider={rider} />
                </FormModal>
                {hasAdminKey && rider.email && (
                  <FormModal
                    action={setRiderPassword}
                    title={`App password · ${rider.full_name}`}
                    description={`Rider app login: ${rider.email}`}
                    trigger="App password"
                    triggerClassName={triggerLink}
                    submitLabel="Set password"
                  >
                    <Hidden name="id" value={rider.id} />
                    <Field label="Password" name="password" type="text" required hint="At least 8 characters" />
                  </FormModal>
                )}
                {cash > 0 && (
                  <ConfirmButton
                    action={receiveRiderCash}
                    fields={{ id: rider.id }}
                    confirm={`Confirm you received ${formatMoney(cash)} from ${rider.full_name}?`}
                    className="text-good hover:underline font-medium text-xs"
                  >
                    Receive cash
                  </ConfirmButton>
                )}
                <span className="ml-auto">
                  <ConfirmButton action={deleteRider} fields={{ id: rider.id }} confirm={`Delete rider “${rider.full_name}”?`}>
                    Delete
                  </ConfirmButton>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
