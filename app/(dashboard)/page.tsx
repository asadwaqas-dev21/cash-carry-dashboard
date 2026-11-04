export const revalidate = 0;

import Link from 'next/link';
import { requirePageAccess } from '@/lib/auth';
import { formatDateTime, formatMoney, formatNumber, initials, labelize, orderStatusClass, percent, startOfDaysAgoIso, startOfTodayIso } from '@/lib/format';
import { CLOSED_ORDER_STATUSES } from '@/lib/enums';
import { openSession } from '@/lib/cash';

const CHART_DAYS = 30;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** "+12.4%" vs a previous value; null when there's nothing to compare against. */
function change(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function ChangeBadge({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <div className="text-2xs text-ink-400">{label}</div>;
  const up = value >= 0;
  return (
    <div className={`text-2xs font-medium num tabular flex items-center gap-0.5 ${up ? 'text-good' : 'text-bad'}`} title={label}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points={up ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
      </svg>
      {Math.abs(value).toFixed(1)}%
    </div>
  );
}

export default async function DashboardOverview() {
  const { user, supabase } = await requirePageAccess('/');
  const todayIso = startOfTodayIso();
  const yesterdayIso = startOfDaysAgoIso(1);

  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', user.orgId)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  const [
    { data: periodOrders },
    { data: todayItems },
    { data: balances },
    { data: recentOrdersData },
    { data: riders },
    { data: todayDeliveries },
    session,
  ] = await Promise.all([
    supabase.from('orders').select('placed_at, channel, grand_total, status').gte('placed_at', startOfDaysAgoIso(CHART_DAYS - 1)),
    supabase
      .from('order_items')
      .select('product_id, product_name, sku, quantity, orders!inner(placed_at, status)')
      .gte('orders.placed_at', todayIso),
    supabase.from('inventory_balances').select('quantity_on_hand, reorder_level, products(name, reorder_level)').limit(2000),
    supabase.from('orders').select('id, order_number, channel, grand_total, status, customers(display_name, type)').order('placed_at', { ascending: false }).limit(6),
    supabase.from('riders').select('id, full_name, rider_code, status').eq('is_active', true).order('full_name'),
    supabase.from('deliveries').select('rider_id, status').gte('created_at', todayIso),
    location ? openSession(supabase, user.orgId, location.id) : Promise.resolve(null),
  ]);

  const valid = (periodOrders || []).filter((o) => !CLOSED_ORDER_STATUSES.includes(o.status));
  const todayOrders = valid.filter((o) => o.placed_at >= todayIso);
  const yesterdayOrders = valid.filter((o) => o.placed_at >= yesterdayIso && o.placed_at < todayIso);

  const revenueOf = (list: typeof valid) => list.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
  const revenueToday = revenueOf(todayOrders);
  const posRevenue = revenueOf(todayOrders.filter((o) => o.channel === 'pos'));
  const appRevenue = revenueOf(todayOrders.filter((o) => o.channel === 'app'));
  const otherRevenue = revenueToday - posRevenue - appRevenue;

  // Daily revenue for the chart, oldest first.
  const days = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date(startOfDaysAgoIso(CHART_DAYS - 1 - i));
    return { key: d.toDateString(), label: new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(d), pos: 0, app: 0 };
  });
  for (const o of valid) {
    const day = days.find((d) => d.key === new Date(o.placed_at).toDateString());
    if (!day) continue;
    if (o.channel === 'pos') day.pos += Number(o.grand_total || 0);
    else day.app += Number(o.grand_total || 0);
  }
  const maxDay = Math.max(...days.map((d) => d.pos + d.app), 1);
  const periodRevenue = days.reduce((s, d) => s + d.pos + d.app, 0);

  // Channel split for the last 7 days.
  const week = valid.filter((o) => o.placed_at >= startOfDaysAgoIso(6));
  const weekTotal = revenueOf(week);
  const channelSplit = [
    { label: 'In-store POS', value: revenueOf(week.filter((o) => o.channel === 'pos')), color: 'bg-seriesPos' },
    { label: 'Customer app', value: revenueOf(week.filter((o) => o.channel === 'app')), color: 'bg-seriesApp' },
    { label: 'Phone / walk-in / other', value: revenueOf(week.filter((o) => !['pos', 'app'].includes(o.channel))), color: 'bg-ink-300' },
  ];

  const restock = (balances || [])
    .map((b: any) => ({
      name: b.products?.name || 'Unknown',
      left: Number(b.quantity_on_hand || 0),
      level: Number(b.reorder_level || b.products?.reorder_level || 0),
    }))
    .filter((b) => b.left <= b.level)
    .sort((a, b) => a.left - b.left);

  const movers: Record<string, { name: string; sku: string; count: number }> = {};
  for (const item of todayItems || []) {
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
    if (!order || CLOSED_ORDER_STATUSES.includes(order.status)) continue;
    const key = item.product_id || item.product_name;
    movers[key] ||= { name: item.product_name, sku: item.sku || '', count: 0 };
    movers[key].count += Number(item.quantity || 0);
  }
  const topMovers = Object.values(movers).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxMover = topMovers[0]?.count || 1;

  const riderStats = (riders || []).map((r: any) => {
    const mine = (todayDeliveries || []).filter((d) => d.rider_id === r.id);
    return { ...r, trips: mine.length, delivered: mine.filter((d) => d.status === 'delivered').length };
  }).sort((a, b) => b.trips - a.trips).slice(0, 5);
  const ridersOnShift = (riders || []).filter((r: any) => ['available', 'on_delivery'].includes(r.status)).length;

  // The open register session's sales and payment split.
  let sessionStats = { revenue: 0, count: 0, cash: 0, card: 0 };
  if (session) {
    const [{ data: sessionOrders }, { data: sessionPayments }] = await Promise.all([
      supabase.from('orders').select('grand_total, status').eq('pos_session_id', session.id),
      supabase.from('payments').select('method, amount').eq('pos_session_id', session.id).eq('status', 'paid'),
    ]);
    const live = (sessionOrders || []).filter((o) => !CLOSED_ORDER_STATUSES.includes(o.status));
    sessionStats = {
      revenue: live.reduce((s, o) => s + Number(o.grand_total || 0), 0),
      count: live.length,
      cash: (sessionPayments || []).filter((p) => p.method === 'cash').reduce((s, p) => s + Number(p.amount), 0),
      card: (sessionPayments || []).filter((p) => p.method === 'card').reduce((s, p) => s + Number(p.amount), 0),
    };
  }
  const sessionPaid = sessionStats.cash + sessionStats.card;

  const headerDate = new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const firstName = user.fullName.split(' ')[0];
  const recentOrders = recentOrdersData || [];

  return (
    <section id="page-overview" className="page active px-6 py-5">
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs text-ink-400 uppercase tracking-wider mb-1">{headerDate}</div>
          <h1 className="text-2xl font-semibold tracking-tight2">{greeting()} {firstName}</h1>
          <div className="text-sm text-ink-500 mt-1">
            Register {session ? 'open' : 'closed'} · {ridersOnShift} {ridersOnShift === 1 ? 'rider' : 'riders'} on shift · {restock.length} {restock.length === 1 ? 'item needs' : 'items need'} restocking
          </div>
        </div>
        <Link href="/pos" className="h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New sale
        </Link>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">Revenue today</div>
            <ChangeBadge value={change(revenueToday, revenueOf(yesterdayOrders))} label="vs yesterday" />
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xs text-ink-400 num">Rs</span>
            <span className="text-3xl font-semibold tracking-tight3 num tabular">{formatNumber(revenueToday)}</span>
          </div>
          <div className="h-1 bg-borderMuted rounded-full overflow-hidden flex gap-px">
            <div className="bg-seriesPos h-full" style={{ width: `${percent(posRevenue, revenueToday)}%` }}></div>
            <div className="bg-seriesApp h-full" style={{ width: `${percent(appRevenue, revenueToday)}%` }}></div>
            {otherRevenue > 0 && <div className="bg-ink-300 h-full" style={{ width: `${percent(otherRevenue, revenueToday)}%` }}></div>}
          </div>
          <div className="flex items-center justify-between mt-2 text-2xs">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-seriesPos"></div>
              <span className="text-ink-500">POS <span className="num tabular text-ink-700 font-medium ml-0.5">{formatNumber(posRevenue)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-sm bg-seriesApp"></div>
              <span className="text-ink-500">App <span className="num tabular text-ink-700 font-medium ml-0.5">{formatNumber(appRevenue)}</span></span>
            </div>
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">Orders today</div>
            <ChangeBadge value={change(todayOrders.length, yesterdayOrders.length)} label="vs yesterday" />
          </div>
          <div className="text-3xl font-semibold tracking-tight3 num tabular mb-3">{todayOrders.length}</div>
          <div className="flex items-center justify-between text-2xs text-ink-500">
            <span>Yesterday</span>
            <span className="num tabular">{yesterdayOrders.length}</span>
          </div>
          <div className="flex items-center justify-between text-2xs text-ink-500 mt-1">
            <span>Avg / day, last {CHART_DAYS} days</span>
            <span className="num tabular">{formatNumber(valid.length / CHART_DAYS, 1)}</span>
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">Register</div>
            {session ? (
              <span className="terminal-badge bg-goodSoft text-good">
                <span className="pulse-dot"><span className="block w-1.5 h-1.5 rounded-full bg-good"></span></span>
                Open
              </span>
            ) : (
              <span className="terminal-badge bg-ink-100 text-ink-500">Closed</span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-semibold tracking-tight3 num tabular">{sessionStats.count}</span>
            <span className="text-sm text-ink-400">sales this session</span>
          </div>
          <div className="pt-2 border-t border-borderMuted text-2xs text-ink-500">
            {session ? (
              <>Opened {formatDateTime(session.opened_at)}{session.staff?.full_name ? ` by ${session.staff.full_name}` : ''}</>
            ) : (
              <Link href="/cash" className="text-brand hover:underline">Open the register →</Link>
            )}
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium">Restock needed</div>
            <Link href="/inventory" className="text-2xs text-brand hover:underline">Inventory →</Link>
          </div>
          <div className={`text-3xl font-semibold tracking-tight3 num tabular mb-3 ${restock.length ? 'text-warn' : ''}`}>{restock.length}</div>
          <div className="space-y-1">
            {restock.length === 0 && <div className="text-2xs text-ink-400">Everything is above its reorder level.</div>}
            {restock.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-2xs">
                <span className="text-ink-700 truncate">{item.name}</span>
                <span className={`num tabular ${item.left <= 0 ? 'text-bad' : 'text-warn'} font-medium`}>{formatNumber(item.left)} left</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue chart + channel split */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="col-span-2 bg-panel border border-border rounded-lg p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Revenue, last {CHART_DAYS} days</h3>
              <div className="text-xs text-ink-400 mt-0.5">{formatMoney(periodRevenue)} total · POS versus app and other orders</div>
            </div>
            <div className="flex items-center gap-3 text-2xs text-ink-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-seriesPos"></span>POS</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-seriesApp"></span>App &amp; other</span>
            </div>
          </div>
          {periodRevenue === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-ink-400 border border-dashed border-border rounded-md">
              No sales in the last {CHART_DAYS} days yet.
            </div>
          ) : (
            <>
              <div className="h-[180px] flex items-end gap-[2px] border-b border-border" role="img" aria-label={`Daily revenue for the last ${CHART_DAYS} days`}>
                {days.map((d) => {
                  const total = d.pos + d.app;
                  return (
                    <div
                      key={d.key}
                      className="group relative flex-1 h-full flex flex-col justify-end hover:bg-canvas rounded-t"
                      title={`${d.label}: ${formatMoney(total)} (POS ${formatMoney(d.pos)}, App & other ${formatMoney(d.app)})`}
                    >
                      {total > 0 && (
                        <div className="w-full flex flex-col gap-[2px] rounded-t-[4px] overflow-hidden" style={{ height: `${(total / maxDay) * 100}%` }}>
                          {d.app > 0 && <div className="bg-seriesApp w-full" style={{ flexGrow: d.app }} />}
                          {d.pos > 0 && <div className="bg-seriesPos w-full" style={{ flexGrow: d.pos }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-2xs text-ink-400 mt-1.5 num">
                <span>{days[0].label}</span>
                <span>{days[Math.floor(CHART_DAYS / 2)].label}</span>
                <span>Today</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-panel border border-border rounded-lg p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold">Sales by channel</h3>
            <div className="text-xs text-ink-400 mt-0.5">Last 7 days · {formatMoney(weekTotal)}</div>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex gap-[2px] bg-borderMuted mb-5">
            {channelSplit.filter((c) => c.value > 0).map((c) => (
              <div key={c.label} className={`${c.color} h-full`} style={{ width: `${percent(c.value, weekTotal)}%` }} />
            ))}
          </div>
          <div className="space-y-2.5">
            {channelSplit.map((c) => (
              <div key={c.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-sm ${c.color}`}></div>
                  <span className="text-xs text-ink-700">{c.label}</span>
                </div>
                <div className="text-xs num tabular">
                  <span className="text-ink-500 mr-2">{formatMoney(c.value)}</span>
                  <span className="font-medium">{percent(c.value, weekTotal)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders + register snapshot */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="col-span-2 bg-panel border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Recent orders</h3>
            <Link href="/orders" className="text-xs text-brand hover:text-brand-hover font-medium">View all →</Link>
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
              {recentOrders.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-500">No orders yet. Sales from the POS and the app show here.</td></tr>
              )}
              {recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-canvas transition">
                  <td className="px-5 py-3 num text-xs">
                    <Link href={`/orders/${order.id}`} className="text-brand hover:underline">#{order.order_number}</Link>
                  </td>
                  <td className="py-3">
                    <div className="text-sm font-medium">{order.customers?.display_name || 'Walk-in customer'}</div>
                    <div className="text-2xs text-ink-400">{order.customers?.type === 'business' ? 'Business account' : 'Individual'}</div>
                  </td>
                  <td className="py-3">
                    <span className={`terminal-badge ${order.channel === 'app' ? 'bg-brand-soft text-brand' : 'bg-ink-200/60 text-ink-700'}`}>
                      {order.channel === 'pos' ? 'In-store' : labelize(order.channel)}
                    </span>
                  </td>
                  <td className="py-3 text-right num tabular font-medium">{formatNumber(order.grand_total, 2)}</td>
                  <td className="px-5 py-3"><span className={`terminal-badge ${orderStatusClass(order.status)}`}>{labelize(order.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-panel border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Register snapshot</h3>
            <Link href="/cash" className="text-xs text-brand hover:text-brand-hover font-medium">Open →</Link>
          </div>
          <div className="p-5">
            {!session ? (
              <div className="text-sm text-ink-500">
                The register is closed. Open it under Cash Reconciliation so counter sales are counted toward the drawer.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center">
                    {initials(session.staff?.full_name || user.fullName)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{session.staff?.full_name || 'Register session'}</div>
                    <div className="text-2xs text-ink-400 num tabular">Since {formatDateTime(session.opened_at)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-4 mb-4 border-b border-borderMuted">
                  <div>
                    <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Session revenue</div>
                    <div className="text-xl font-semibold tracking-tight2 num tabular">{formatNumber(sessionStats.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Transactions</div>
                    <div className="text-xl font-semibold tracking-tight2 num tabular">{sessionStats.count}</div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Avg ticket</div>
                    <div className="text-base font-medium num tabular">{formatNumber(sessionStats.count ? sessionStats.revenue / sessionStats.count : 0, 2)}</div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Cash in drawer</div>
                    <div className="text-base font-medium num tabular">{formatNumber(Number(session.opening_float || 0) + sessionStats.cash)}</div>
                  </div>
                </div>

                <div className="text-2xs text-ink-400 uppercase tracking-wider mb-2">Payment split</div>
                <div className="h-1.5 rounded-full overflow-hidden flex gap-[2px] mb-2 bg-borderMuted">
                  <div className="bg-seriesPos h-full" style={{ width: `${percent(sessionStats.cash, sessionPaid)}%` }}></div>
                  <div className="bg-seriesApp h-full" style={{ width: `${percent(sessionStats.card, sessionPaid)}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-2xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-sm bg-seriesPos"></div>
                    <span className="text-ink-500">Cash</span>
                    <span className="num tabular text-ink-700 font-medium">{formatNumber(sessionStats.cash)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-sm bg-seriesApp"></div>
                    <span className="text-ink-500">Card</span>
                    <span className="num tabular text-ink-700 font-medium">{formatNumber(sessionStats.card)}</span>
                  </div>
                </div>
              </>
            )}
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
            {topMovers.length === 0 && <div className="p-4 text-sm text-center text-ink-500">Nothing sold yet today.</div>}
            {topMovers.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
                <div className="w-6 text-xs num tabular text-ink-400 text-center">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-2xs text-ink-400">{item.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm num tabular font-medium">{formatNumber(item.count)}</div>
                  <div className="text-2xs text-ink-400">units</div>
                </div>
                <div className="w-16">
                  <div className="h-1 bg-borderMuted rounded-full overflow-hidden">
                    <div className="h-full bg-seriesPos" style={{ width: `${Math.round((item.count / maxMover) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-semibold">Riders today</h3>
            <Link href="/riders" className="text-xs text-brand hover:text-brand-hover font-medium">View all →</Link>
          </div>
          <div className="p-3 space-y-1">
            {riderStats.length === 0 && <div className="p-4 text-sm text-center text-ink-500">No riders yet.</div>}
            {riderStats.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded hover:bg-canvas">
                <div className="w-7 h-7 rounded-full bg-brand-soft text-brand text-2xs font-semibold flex items-center justify-center shrink-0">{initials(r.full_name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.full_name}</div>
                  <div className="text-2xs text-ink-400">{r.rider_code} · {labelize(r.status).toLowerCase()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm num tabular font-medium">{r.trips} {r.trips === 1 ? 'trip' : 'trips'}</div>
                  <div className="text-2xs text-good">{r.delivered} delivered</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
