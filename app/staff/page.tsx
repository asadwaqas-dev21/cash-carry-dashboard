import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export default async function StaffPage() {
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .order('full_name');

  const staffList = staff || [];
  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Staff & Team</h1>
          <div className="text-sm text-ink-500 mt-1">Manage employees, shifts, and system access roles</div>
        </div>
        <button className="h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Staff Member
        </button>
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Name</th>
                <th className="text-left font-medium py-3">Role</th>
                <th className="text-left font-medium py-3">Contact</th>
                <th className="text-left font-medium py-3">Current Status</th>
                <th className="text-right font-medium px-5 py-3">Access Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                    No staff members found. Please add staff to your Supabase database.
                  </td>
                </tr>
              )}
              {staffList.map((person: any) => {
                const statusLabel = person.is_on_shift ? "Active (On Shift)" : "Off Shift";
                const accessLevel = person.role === 'admin' ? 'Admin' : person.role === 'manager' ? 'Manager' : person.role === 'cashier' ? 'POS Only' : person.role === 'inventory_clerk' ? 'Inventory Manager' : 'Staff';
                const name = person.full_name || 'Unknown';
                
                return (
                  <tr key={person.id} className="hover:bg-canvas transition cursor-pointer">
                    <td className="px-5 py-4 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs font-semibold">
                        {name.substring(0,2).toUpperCase()}
                      </div>
                      {name}
                    </td>
                    <td className="py-4 text-ink-700 capitalize">{person.role.replace('_', ' ')}</td>
                    <td className="py-4 text-ink-500 num tabular text-xs">{person.contact_number || person.phone || '-'}</td>
                    <td className="py-4">
                      <span className={`terminal-badge ${person.is_on_shift ? 'bg-goodSoft text-good' : 'bg-ink-100 text-ink-500'}`}>
                        {person.is_on_shift && <span className="pulse-dot"><span className="block w-1.5 h-1.5 rounded-full bg-good"></span></span>}
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="bg-canvas border border-border px-2 py-1 rounded text-xs text-ink-500">{accessLevel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
