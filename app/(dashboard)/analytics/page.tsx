import { supabase } from '@/lib/supabase';
import { formatMoney, startOfDaysAgoIso, sumBy } from '@/lib/format';

export const revalidate = 0;

export default async function AnalyticsPage() {
  const { data: orders } = await supabase
    .from('orders')
    .select('grand_total, currency_code')
    .gte('placed_at', startOfDaysAgoIso(7));
  const orderList = orders || [];
  const currency = orderList[0]?.currency_code || 'Rs';
  const sales = sumBy(orderList, (order: any) => order.grand_total);

  return (
    <section className="px-6 py-5">
      <h1 className="text-2xl font-semibold tracking-tight2 mb-2">Analytics</h1>
      <div className="text-sm text-ink-500 mb-6">Last 7 days from Supabase orders</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-panel border border-border rounded-lg p-5">
          <div className="text-sm text-ink-500 mb-1">Gross Sales</div>
          <div className="text-2xl font-semibold num tabular">{formatMoney(sales, currency)}</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-5">
          <div className="text-sm text-ink-500 mb-1">Orders</div>
          <div className="text-2xl font-semibold num tabular">{orderList.length}</div>
        </div>
      </div>
    </section>
  );
}
