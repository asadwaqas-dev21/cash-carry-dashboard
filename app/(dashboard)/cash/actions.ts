'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, defaultLocationId, oneOf, optAmount, optStr, str, type ActionState } from '@/lib/action-state';
import { formatMoney } from '@/lib/format';
import { expectedCash } from '@/lib/cash';

function revalidateCash() {
  revalidatePath('/cash');
  revalidatePath('/pos');
  revalidatePath('/');
}

/** The register device for a location; created on first use. */
async function registerDevice(supabase: SupabaseClient, orgId: string, locationId: string) {
  const { data } = await supabase
    .from('pos_devices')
    .select('id')
    .eq('org_id', orgId)
    .eq('location_id', locationId)
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (data) return data.id as string;

  const created = check(
    await supabase
      .from('pos_devices')
      .insert({ org_id: orgId, location_id: locationId, device_code: 'POS-1', name: 'Main counter', status: 'online' })
      .select('id')
      .single()
  ) as { id: string };
  return created.id;
}

export async function openRegister(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const locationId = await defaultLocationId(supabase, user.orgId);

    const { count } = await supabase
      .from('pos_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', user.orgId)
      .eq('location_id', locationId)
      .eq('status', 'open');
    if (count) throw new Error('The register is already open.');

    const openingFloat = optAmount(formData, 'opening_float', 'Opening float') ?? 0;
    const deviceId = await registerDevice(supabase, user.orgId, locationId);
    const { data: staff } = await supabase.from('staff').select('id').eq('profile_id', user.id).limit(1).maybeSingle();

    check(
      await supabase.from('pos_sessions').insert({
        org_id: user.orgId,
        location_id: locationId,
        device_id: deviceId,
        staff_id: staff?.id ?? null,
        status: 'open',
        opening_float: openingFloat,
        expected_cash: openingFloat,
        notes: optStr(formData, 'notes'),
      })
    );
    revalidateCash();
    return 'Register opened.';
  });
}

/** Closes the register with the counted cash and files a reconciliation for review. */
export async function closeRegister(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const sessionId = str(formData, 'session_id');
    const counted = optAmount(formData, 'counted_cash', 'Counted cash');
    if (counted === null) throw new Error('Enter the cash you counted in the drawer.');

    const session = check(
      await supabase
        .from('pos_sessions')
        .select('id, location_id, opening_float, status')
        .eq('id', sessionId)
        .eq('org_id', user.orgId)
        .maybeSingle()
    ) as { id: string; location_id: string; opening_float: number; status: string } | null;
    if (!session || session.status !== 'open') throw new Error('This register session is no longer open.');

    const expected = await expectedCash(supabase, session);
    const notes = optStr(formData, 'notes');
    const now = new Date().toISOString();

    checkAffected(
      await supabase
        .from('pos_sessions')
        .update({ status: 'closed', closed_at: now, expected_cash: expected, counted_cash: counted, notes })
        .eq('id', session.id)
        .select('id')
    );
    check(
      await supabase.from('cash_reconciliations').insert({
        org_id: user.orgId,
        location_id: session.location_id,
        pos_session_id: session.id,
        status: 'submitted',
        expected_cash: expected,
        counted_cash: counted,
        submitted_by: user.id,
        submitted_at: now,
        notes,
      })
    );

    revalidateCash();
    const difference = counted - expected;
    if (Math.abs(difference) < 0.005) return 'Register closed. The count matches.';
    return `Register closed. ${difference > 0 ? 'Over' : 'Short'} by ${formatMoney(Math.abs(difference))}.`;
  });
}

export async function reviewReconciliation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const decision = oneOf(formData, 'decision', ['approved', 'rejected'] as const, 'decision');
    checkAffected(
      await supabase
        .from('cash_reconciliations')
        .update({ status: decision, approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', str(formData, 'id'))
        .eq('org_id', user.orgId)
        .eq('status', 'submitted')
        .select('id')
    );
    revalidateCash();
    return decision === 'approved' ? 'Reconciliation approved.' : 'Reconciliation rejected.';
  });
}
