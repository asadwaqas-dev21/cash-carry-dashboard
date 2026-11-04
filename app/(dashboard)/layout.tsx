import DashboardLayout from '@/components/DashboardLayout';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { ACTIVE_DELIVERY_STATUSES } from '@/lib/enums';
import type { SidebarBadges } from '@/components/Sidebar';

async function loadBadges(): Promise<SidebarBadges> {
  const supabase = await createClient();
  const [{ count: openOrders }, { count: activeDeliveries }, { data: balances }] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'preparing', 'ready']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).in('status', ACTIVE_DELIVERY_STATUSES),
    supabase.from('inventory_balances').select('quantity_on_hand, reorder_level').limit(2000),
  ]);
  const lowStock = (balances || []).filter((b) => Number(b.quantity_on_hand) <= Number(b.reorder_level)).length;
  return { openOrders: openOrders || 0, activeDeliveries: activeDeliveries || 0, lowStock };
}

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const badges = await loadBadges();
  return <DashboardLayout user={user} badges={badges}>{children}</DashboardLayout>;
}
