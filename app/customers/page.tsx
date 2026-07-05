import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export default async function CustomersPage() {
  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      orders ( grand_total )
    `)
    .order('display_name');

  const customersList = customers || [];
  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Customers</h1>
          <div className="text-sm text-ink-500 mt-1">Manage wholesale accounts and individual buyers</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-2 text-ink-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search customer name or phone" className="pl-8 pr-3 h-8 w-64 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
          </div>
          <button className="h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Customer
          </button>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Customer</th>
                <th className="text-left font-medium py-3">Type</th>
                <th className="text-left font-medium py-3">Contact</th>
                <th className="text-right font-medium py-3">Total Orders</th>
                <th className="text-right font-medium px-5 py-3">Lifetime Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {customersList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                    No customers found. Please add customers to your Supabase database.
                  </td>
                </tr>
              )}
              {customersList.map((item: any) => {
                const typeLabel = item.customer_type === 'b2b_wholesale' ? 'B2B Wholesale' : 'Individual';
                const orderCount = item.orders?.length || 0;
                const ltv = item.orders?.reduce((sum: number, order: any) => sum + Number(order.grand_total || 0), 0) || 0;
                const name = item.display_name || item.full_name || 'Unknown';
                
                return (
                  <tr key={item.id} className="hover:bg-canvas transition cursor-pointer">
                    <td className="px-5 py-4 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-xs font-semibold text-ink-700">
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      {name}
                    </td>
                    <td className="py-4">
                      <span className={`terminal-badge ${typeLabel.includes('B2B') ? 'bg-brand-soft text-brand' : 'bg-ink-100 text-ink-600'}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="py-4 text-ink-500 num tabular text-xs">{item.phone || '-'}</td>
                    <td className="py-4 text-right num tabular font-medium">{orderCount}</td>
                    <td className="px-5 py-4 text-right num tabular font-medium text-ink-700">Rs {ltv.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
