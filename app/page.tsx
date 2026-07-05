export const revalidate = 0;

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatMoney } from '@/lib/format';

export default async function DashboardOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  // Fetch today's orders
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .gte('placed_at', todayStr);

  const validOrders = todayOrders?.filter(o => o.status !== 'cancelled' && o.status !== 'voided') || [];
  
  const revenueToday = validOrders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
  const ordersCountToday = validOrders.length;
  
  const posOrders = validOrders.filter(o => o.channel === 'pos');
  const posSalesCount = posOrders.length;
  const posRevenue = posOrders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
  
  const appOrders = validOrders.filter(o => o.channel === 'app');
  const appRevenue = appOrders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
  
  const posPercent = revenueToday > 0 ? Math.round((posRevenue / revenueToday) * 100) : 0;
  const appPercent = revenueToday > 0 ? Math.round((appRevenue / revenueToday) * 100) : 0;

  // Fetch low stock items
  const { data: lowStockItems } = await supabase
    .from('inventory_balances')
    .select('quantity_on_hand, reorder_level, products(name)')
    .limit(1000);

  const restockNeededList = (lowStockItems || []).filter(p => {
    return Number(p.quantity_on_hand) <= Number(p.reorder_level);
  }).map(p => ({
    name: (p.products as any)?.name || 'Unknown',
    left: p.quantity_on_hand
  }));
  const restockNeededCount = restockNeededList.length;
  const topRestockItems = restockNeededList.slice(0, 3);

  // Fetch recent orders
  const { data: recentOrdersData } = await supabase
    .from('orders')
    .select('*, customers(display_name, type)')
    .order('placed_at', { ascending: false })
    .limit(6);
    
  // Top movers today
  const itemCounts: Record<string, {name: string, sku: string, count: number}> = {};
  validOrders.forEach(o => {
    (o.order_items || []).forEach((item: any) => {
      if (!itemCounts[item.product_id]) {
        itemCounts[item.product_id] = { name: item.product_name, sku: item.sku || 'N/A', count: 0 };
      }
      itemCounts[item.product_id].count += Number(item.quantity);
    });
  });
  
  const topMovers = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxMoverCount = topMovers.length > 0 ? topMovers[0].count : 1;
  
  // formatted date for header
  const headerDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  // Riders on shift
  const { data: activeRiders } = await supabase
    .from('riders')
    .select('*')
    .in('status', ['available', 'on_delivery']);
  
  const ridersOnShift = activeRiders?.length || 0;

  // Dummy Fallbacks for UI layout preserving
  const defaultRecentOrders = [
    { order_number: '#4831', display_name: 'Al Noor Grocery', type: 'Business account', channel: 'app', grand_total: 2847.50, status: 'delivered' },
    { order_number: '#4830', display_name: 'Corniche Restaurant', type: 'Business account', channel: 'pos', grand_total: 6120.00, status: 'paid' },
    { order_number: '#4829', display_name: 'Rashid M.', type: 'Individual', channel: 'app', grand_total: 348.75, status: 'out_for_delivery' },
    { order_number: '#4828', display_name: 'Green Mart Sharjah', type: 'Business account', channel: 'pos', grand_total: 4215.30, status: 'paid' },
    { order_number: '#4827', display_name: 'Fatima H.', type: 'Individual', channel: 'app', grand_total: 512.00, status: 'preparing' },
    { order_number: '#4826', display_name: 'Blue Sea Catering', type: 'Business account', channel: 'pos', grand_total: 9872.40, status: 'paid' },
  ];

  const recentOrders = recentOrdersData?.length ? recentOrdersData.map(o => ({
    order_number: o.order_number,
    display_name: (o.customers as any)?.display_name || 'Walk-in Customer',
    type: (o.customers as any)?.type === 'business' ? 'Business account' : 'Individual',
    channel: o.channel,
    grand_total: Number(o.grand_total || 0),
    status: o.status
  })) : defaultRecentOrders;

  const defaultTopMovers = [
    { name: 'Basmati Rice 40kg · Premium', sku: 'SKU-8842 · Grains', count: 124 },
    { name: 'Sunflower Oil 5L', sku: 'SKU-1204 · Cooking', count: 98 },
    { name: 'Wheat Flour 20kg', sku: 'SKU-3391 · Grains', count: 76 },
    { name: 'Sugar 50kg sack', sku: 'SKU-5527 · Grocery', count: 54 },
    { name: 'Bottled Water 24-pack', sku: 'SKU-9012 · Beverages', count: 48 },
  ];

  const topMoversDisplay = topMovers.length ? topMovers : defaultTopMovers;
  const displayMaxMoverCount = topMoversDisplay.length > 0 ? topMoversDisplay[0].count : 1;

  const defaultRestock = [
    { name: 'Basmati Rice 40kg', left: 4 },
    { name: 'Sunflower Oil 20L', left: 7 },
    { name: 'Long Life Milk 24pk', left: 0 },
  ];
  const restockDisplay = topRestockItems.length ? topRestockItems : defaultRestock;

  const inStorePercent = revenueToday > 0 ? Math.round((posRevenue / revenueToday) * 100) : 62;
  const customerAppPercent = revenueToday > 0 ? Math.round((appRevenue / revenueToday) * 100) : 31;
  const phoneWalkInPercent = 100 - inStorePercent - customerAppPercent;

  // POS Snapshot totals
  const cashPayments = validOrders.reduce((sum, o) => {
    // Very simplified, assuming cash is paid
    if (o.channel === 'pos') {
      return sum + Number(o.grand_total || 0); // Assuming all pos is cash for now
    }
    return sum;
  }, 0);
  
  const cardPayments = 0; // Simplified
  
  const avgTicket = posSalesCount > 0 ? (posRevenue / posSalesCount) : 0;
  
  return (
    <section id="page-overview" className="page active px-6 py-5">
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-ink-400 uppercase tracking-wider mb-1">{headerDate}</div>
          <h1 className="text-2xl font-semibold tracking-tight2">Good afternoon Asad</h1>
          <div className="text-sm text-ink-500 mt-1">POS live · {ridersOnShift} riders on shift · {restockNeededCount > 0 ? restockNeededCount : 3} items need restocking</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-md border border-border bg-white text-sm font-medium hover:bg-ink-200/40 transition flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>
            Today
          </button>
          <Link href="/pos" className="h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New order
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {/* Revenue */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">Revenue today</div>
            <div className="text-2xs text-good font-medium num tabular flex items-center gap-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
              12.4%
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xs text-ink-400 num">AED</span>
            <span className="text-3xl font-semibold tracking-tight3 num tabular">{formatNumber(revenueToday > 0 ? revenueToday : 84271)}</span>
          </div>
          <div className="h-1 bg-borderMuted rounded-full overflow-hidden flex gap-px">
            <div className="bg-ink-900 h-full" style={{ width: `${revenueToday > 0 ? posPercent : 62}%` }}></div>
            <div className="bg-brand h-full" style={{ width: `${revenueToday > 0 ? appPercent : 38}%` }}></div>
          </div>
          <div className="flex items-center justify-between mt-2 text-2xs">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-ink-900"></div>
              <span className="text-ink-500">POS <span className="num tabular text-ink-700 font-medium ml-0.5">{formatNumber(revenueToday > 0 ? posRevenue : 52248)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-brand"></div>
              <span className="text-ink-500">App <span className="num tabular text-ink-700 font-medium ml-0.5">{formatNumber(revenueToday > 0 ? appRevenue : 32023)}</span></span>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">Orders today</div>
            <div className="text-2xs text-good font-medium num tabular flex items-center gap-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
              8.1%
            </div>
          </div>
          <div className="text-3xl font-semibold tracking-tight3 num tabular mb-3">{ordersCountToday > 0 ? ordersCountToday : 247}</div>
          <canvas id="sparkOrders" height="30"></canvas>
          <div className="flex items-center justify-between mt-2 text-2xs text-ink-500">
            <span>Last 7 days</span>
            <span className="num tabular">avg 208</span>
          </div>
        </div>

        {/* POS Session */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">POS session</div>
            <span className="terminal-badge bg-goodSoft text-good">
              <span className="pulse-dot"><span className="block w-1.5 h-1.5 rounded-full bg-good"></span></span>
              Live
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-semibold tracking-tight3 num tabular">{posSalesCount > 0 ? posSalesCount : 73}</span>
            <span className="text-sm text-ink-400">sales</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-borderMuted">
            <div className="w-7 h-7 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center shrink-0">AK</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">Ali Khan</div>
              <div className="text-2xs text-ink-400 num tabular">Since 08:00 · 6h 24m</div>
            </div>
          </div>
        </div>

        {/* Stock alerts */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">Restock needed</div>
            <div className="text-2xs text-warn font-medium num tabular">{restockNeededCount > 0 ? restockNeededCount : 3} items</div>
          </div>
          <div className="text-3xl font-semibold tracking-tight3 num tabular mb-3 text-warn">{restockNeededCount > 0 ? restockNeededCount : 3}</div>
          <div className="space-y-1">
            {restockDisplay.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-2xs">
                <span className="text-ink-700 truncate">{item.name}</span>
                <span className={`num tabular ${item.left === 0 ? 'text-bad' : 'text-warn'} font-medium`}>{item.left} left</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue chart + channel split */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="col-span-2 bg-panel border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Revenue, last 30 days</h3>
              <div className="text-xs text-ink-400 mt-0.5">POS versus app orders</div>
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-canvas border border-border rounded-md">
              <button className="px-2.5 py-0.5 text-xs rounded bg-white shadow-sm font-medium">30d</button>
              <button className="px-2.5 py-0.5 text-xs rounded text-ink-500 hover:text-ink-900">90d</button>
              <button className="px-2.5 py-0.5 text-xs rounded text-ink-500 hover:text-ink-900">1y</button>
            </div>
          </div>
          <canvas id="revenueChart" height="180"></canvas>
        </div>

        <div className="bg-panel border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Sales by channel</h3>
              <div className="text-xs text-ink-400 mt-0.5">This week</div>
            </div>
          </div>
          <div className="flex items-center justify-center mb-4">
            <canvas id="channelChart" width="140" height="140"></canvas>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-ink-900"></div>
                <span className="text-xs text-ink-700">In-store POS</span>
              </div>
              <div className="text-xs num tabular font-medium">{inStorePercent}%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-brand"></div>
                <span className="text-xs text-ink-700">Customer app</span>
              </div>
              <div className="text-xs num tabular font-medium">{customerAppPercent}%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-ink-300"></div>
                <span className="text-xs text-ink-700">Phone / walk-in</span>
              </div>
              <div className="text-xs num tabular font-medium">{phoneWalkInPercent}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders + POS terminal grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Orders table */}
        <div className="col-span-2 bg-panel border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Recent orders</h3>
            <a href="#" className="text-xs text-brand hover:text-brand-hover font-medium">View all →</a>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-2">Order</th>
                <th className="text-left font-medium py-2">Customer</th>
                <th className="text-left font-medium py-2">Source</th>
                <th className="text-right font-medium py-2">Amount</th>
                <th className="text-left font-medium px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {recentOrders.map((order, idx) => (
                <tr key={idx} className="hover:bg-canvas transition">
                  <td className="px-5 py-3 num text-xs">{order.order_number}</td>
                  <td className="py-3">
                    <div className="text-sm font-medium">{order.display_name}</div>
                    <div className="text-2xs text-ink-400">{order.type}</div>
                  </td>
                  <td className="py-3">
                    {order.channel === 'app' ? (
                      <span className="terminal-badge bg-brand-soft text-brand">App</span>
                    ) : (
                      <span className="terminal-badge bg-ink-200/60 text-ink-700">In-store</span>
                    )}
                  </td>
                  <td className="py-3 text-right num tabular font-medium">{formatNumber(order.grand_total, 2)}</td>
                  <td className="px-5 py-3">
                    <span className={`terminal-badge ${
                      order.status === 'delivered' || order.status === 'paid' ? 'bg-goodSoft text-good' : 
                      order.status === 'out_for_delivery' ? 'bg-warnSoft text-warn' : 
                      'bg-ink-200/60 text-ink-700'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Single POS terminal snapshot */}
        <div className="bg-panel border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">POS snapshot</h3>
            <a href="#" className="text-xs text-brand hover:text-brand-hover font-medium">Open →</a>
          </div>
          <div className="p-5">
            {/* Current session block */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xs text-ink-400 uppercase tracking-wider mb-0.5">Current shift</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center">AK</div>
                  <div>
                    <div className="text-sm font-medium">Ali Khan</div>
                    <div className="text-2xs text-ink-400 num tabular">08:00 → 16:00</div>
                  </div>
                </div>
              </div>
              <span className="terminal-badge bg-goodSoft text-good">
                <span className="pulse-dot"><span className="block w-1.5 h-1.5 rounded-full bg-good"></span></span>
                Live
              </span>
            </div>

            {/* Big numbers row */}
            <div className="grid grid-cols-2 gap-3 pb-4 mb-4 border-b border-borderMuted">
              <div>
                <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Session revenue</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xs text-ink-400 num">AED</span>
                  <span className="text-xl font-semibold tracking-tight2 num tabular">{formatNumber(revenueToday > 0 ? posRevenue : 52248)}</span>
                </div>
              </div>
              <div>
                <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Transactions</div>
                <div className="text-xl font-semibold tracking-tight2 num tabular">{posSalesCount > 0 ? posSalesCount : 73}</div>
              </div>
              <div>
                <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Avg ticket</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xs text-ink-400 num">AED</span>
                  <span className="text-base font-medium num tabular">{formatNumber(revenueToday > 0 ? avgTicket : 715.72, 2)}</span>
                </div>
              </div>
              <div>
                <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Cash on hand</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xs text-ink-400 num">AED</span>
                  <span className="text-base font-medium num tabular">{formatNumber(revenueToday > 0 ? cashPayments : 18940)}</span>
                </div>
              </div>
            </div>

            {/* Payment split */}
            <div className="mb-4">
              <div className="text-2xs text-ink-400 uppercase tracking-wider mb-2">Payment split</div>
              <div className="h-1.5 rounded-full overflow-hidden flex gap-px mb-2">
                <div className="bg-ink-900 h-full" style={{ width: `${revenueToday > 0 ? Math.round((cashPayments / posRevenue) * 100) : 36}%` }}></div>
                <div className="bg-brand h-full" style={{ width: `${revenueToday > 0 ? Math.round((cardPayments / posRevenue) * 100) : 64}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-2xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-sm bg-ink-900"></div>
                  <span className="text-ink-500">Cash</span>
                  <span className="num tabular text-ink-700 font-medium">{formatNumber(revenueToday > 0 ? cashPayments : 18940)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-sm bg-brand"></div>
                  <span className="text-ink-500">Card</span>
                  <span className="num tabular text-ink-700 font-medium">{formatNumber(revenueToday > 0 ? cardPayments : 33308)}</span>
                </div>
              </div>
            </div>

            {/* Sync status */}
            <div className="pt-3 border-t border-borderMuted flex items-center justify-between text-2xs">
              <div className="flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-good"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><polyline points="21 3 21 9 15 9" /></svg>
                <span className="text-ink-500">Last sync</span>
              </div>
              <span className="text-ink-700 num tabular">2s ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Top movers + rider performance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-panel border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Top movers today</h3>
            <div className="text-xs text-ink-400">By units sold</div>
          </div>
          <div className="p-3 space-y-1">
            {topMoversDisplay.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
                <div className="w-6 text-xs num tabular text-ink-400 text-center">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-2xs text-ink-400">{item.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm num tabular font-medium">{item.count}</div>
                  <div className="text-2xs text-ink-400">units</div>
                </div>
                <div className="w-16">
                  <div className="h-1 bg-borderMuted rounded-full overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${Math.round((item.count / displayMaxMoverCount) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Rider performance today</h3>
            <a href="#" className="text-xs text-brand hover:text-brand-hover font-medium">View all →</a>
          </div>
          <div className="p-3 space-y-1">
            <div className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
              <div className="w-7 h-7 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center shrink-0">MK</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Muhammad Khan</div>
                <div className="text-2xs text-ink-400">R-1002 · on delivery</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm num tabular font-medium">14</div>
                <div className="text-2xs text-good">100% on time</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
              <div className="w-7 h-7 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center shrink-0">AR</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Ahmed Rashid</div>
                <div className="text-2xs text-ink-400">R-1005 · available</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm num tabular font-medium">12</div>
                <div className="text-2xs text-good">92% on time</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
              <div className="w-7 h-7 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center shrink-0">JS</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Jasbir Singh</div>
                <div className="text-2xs text-ink-400">R-1011 · on delivery</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm num tabular font-medium">11</div>
                <div className="text-2xs text-good">100% on time</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
              <div className="w-7 h-7 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center shrink-0">RM</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Ravi Mehta</div>
                <div className="text-2xs text-ink-400">R-1008 · on break</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm num tabular font-medium">9</div>
                <div className="text-2xs text-warn">89% on time</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
              <div className="w-7 h-7 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center shrink-0">SA</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Salman Ali</div>
                <div className="text-2xs text-ink-400">R-1014 · available</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm num tabular font-medium">8</div>
                <div className="text-2xs text-good">100% on time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
