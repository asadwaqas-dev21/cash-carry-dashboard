import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export default async function RidersPage() {
  const { data: riders } = await supabase
    .from('riders')
    .select('*')
    .order('full_name');

  const ridersList = riders || [];
  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Riders & Fleet</h1>
          <div className="text-sm text-ink-500 mt-1">Manage delivery personnel and vehicle assignments</div>
        </div>
        <button className="h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Rider
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {ridersList.length === 0 && (
          <div className="col-span-4 p-8 text-center text-ink-500 bg-panel border border-border rounded-lg">
            No riders found. Please add riders to your Supabase database.
          </div>
        )}
        {ridersList.map((rider: any) => {
          const statusLabel = (rider.status || '').replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          return (
            <div key={rider.id} className="bg-panel border border-border rounded-lg p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-soft text-brand text-sm font-semibold flex items-center justify-center">
                  {(rider.full_name || 'Unknown').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <span className={`terminal-badge ${
                  statusLabel === 'Available' ? 'bg-goodSoft text-good' :
                  statusLabel === 'On Delivery' ? 'bg-brand-soft text-brand' :
                  'bg-ink-100 text-ink-500'
                }`}>
                  {statusLabel === 'On Delivery' && <span className="pulse-dot"><span className="block w-1.5 h-1.5 rounded-full bg-brand"></span></span>}
                  {statusLabel}
                </span>
              </div>
              <div className="font-semibold text-lg">{rider.full_name}</div>
              <div className="text-xs text-ink-400 num tabular mb-4">{rider.rider_code || '-'}</div>
              
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-borderMuted">
                <div>
                  <div className="text-2xs text-ink-400 uppercase tracking-wider mb-0.5">Trips Today</div>
                  <div className="font-semibold num tabular">0</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-400 uppercase tracking-wider mb-0.5">On Time</div>
                  <div className="font-semibold num tabular text-good">100%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
