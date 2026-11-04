"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { formatMoney } from "@/lib/format";

export default function RightSidebar() {
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ rate: 0, active: 0, queue: 0 });
  const [loading, setLoading] = useState(true);
  // "x min ago" is relative to when the feed was loaded.
  const [fetchedAt, setFetchedAt] = useState(0);
  // Refetch on navigation so the feed reflects changes just made.
  const pathname = usePathname();

  useEffect(() => {
    async function fetchData() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [{ count: lastHourCount }, { count: todayCount }, { count: queueCount }] = await Promise.all([
        supabaseBrowser.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', hourAgo.toISOString()),
        supabaseBrowser.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        // Orders waiting to be handled.
        supabaseBrowser.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'preparing', 'ready']),
      ]);

      setMetrics({
        rate: lastHourCount || 0,
        active: todayCount || 0,
        queue: queueCount || 0
      });

      const { data } = await supabaseBrowser
        .from('orders')
        .select('id, order_number, channel, grand_total, created_at, status')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (data) {
        setRecentOrders(data);
      }
      setFetchedAt(Date.now());
      setLoading(false);
    }
    fetchData();
  }, [pathname]);

  const timeAgo = (dateStr: string) => {
    const diff = fetchedAt - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getIconForChannel = (channel: string) => {
    if (channel === 'pos') {
      return (
        <div className="mt-0.5 text-ink-500 shrink-0 bg-ink-200/50 rounded flex items-center justify-center w-5 h-5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
        </div>
      );
    }
    return (
      <div className="mt-0.5 text-brand shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
      </div>
    );
  };

  return (
    <aside className="w-80 bg-panel border-l border-border flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-borderMuted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="pulse-dot text-brand"><span className="block w-1.5 h-1.5 rounded-full bg-brand"></span></span>
          <h2 className="text-sm font-semibold">Live floor</h2>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-borderMuted grid grid-cols-3 gap-2">
        <div>
          <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Last hour</div>
          <div className="text-sm font-medium num tabular text-ink-900">{metrics.rate}</div>
        </div>
        <div>
          <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Today</div>
          <div className="text-sm font-medium num tabular text-ink-900">{metrics.active}</div>
        </div>
        <div>
          <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Queue</div>
          <div className="text-sm font-medium num tabular text-ink-900">{metrics.queue}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="p-4 text-center text-ink-400 text-sm">Loading activity...</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-4 text-center text-ink-400 text-sm">No recent activity</div>
        ) : (
          recentOrders.map((order, i) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="feed-item flex items-start gap-3 p-2 rounded hover:bg-canvas transition" style={{ animationDelay: `${i * 50}ms` }}>
              {getIconForChannel(order.channel)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-700 truncate">{order.channel === 'pos' ? 'POS order' : 'App order'} {order.order_number}</div>
                <div className="text-xs text-ink-500 mt-0.5">{order.status.replace(/_/g, ' ')}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-ink-400 num tabular">{timeAgo(order.created_at)}</div>
                <div className="text-xs text-brand font-medium num tabular mt-0.5">{formatMoney(order.grand_total)}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="p-4 border-t border-borderMuted">
        <Link href="/orders" className="block w-full py-2 text-center bg-white border border-border hover:border-ink-400 text-sm text-ink-700 font-medium rounded-md transition shadow-sm">
          View all orders
        </Link>
      </div>
    </aside>
  );
}
