import type { SupabaseClient } from '@supabase/supabase-js';
import { sumBy } from './format';

/** Cash the drawer should hold: the opening float plus cash sales rung up in this session. */
export async function expectedCash(supabase: SupabaseClient, session: { id: string; opening_float: number }) {
  const { data } = await supabase
    .from('payments')
    .select('amount')
    .eq('pos_session_id', session.id)
    .eq('method', 'cash')
    .eq('status', 'paid');
  return Number(session.opening_float || 0) + sumBy(data || [], (p: any) => p.amount);
}

/** The open register session at a location, if any. */
export async function openSession(supabase: SupabaseClient, orgId: string, locationId: string) {
  const { data } = await supabase
    .from('pos_sessions')
    .select('id, opening_float, opened_at, staff(full_name), locations(name)')
    .eq('org_id', orgId)
    .eq('location_id', locationId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any;
}
