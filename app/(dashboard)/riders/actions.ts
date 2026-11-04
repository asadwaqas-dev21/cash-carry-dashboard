'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, nextCode, oneOf, optStr, str, type ActionState } from '@/lib/action-state';
import { RIDER_STATUSES } from '@/lib/enums';
import { setPasswordLogin } from '@/lib/supabase-admin';

/** Creates or updates a rider. Setting an email lets them sign in to the rider app. */
export async function saveRider(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const id = str(formData, 'id');
    const fullName = str(formData, 'full_name');
    if (!fullName) throw new Error("Enter the rider's name.");

    const email = optStr(formData, 'email')?.toLowerCase() ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

    const isActive = str(formData, 'is_active') !== 'false';
    const fields = {
      full_name: fullName,
      rider_code: str(formData, 'rider_code') || (await nextCode(supabase, 'riders', 'rider_code', user.orgId, 'R')),
      phone: optStr(formData, 'phone'),
      email,
      vehicle_type: optStr(formData, 'vehicle_type'),
      vehicle_number: optStr(formData, 'vehicle_number'),
      status: isActive ? oneOf(formData, 'status', RIDER_STATUSES, 'status') : 'inactive',
      is_active: isActive,
    };

    if (id) {
      checkAffected(await supabase.from('riders').update(fields).eq('id', id).eq('org_id', user.orgId).select('id'));
    } else {
      check(await supabase.from('riders').insert({ ...fields, org_id: user.orgId }));
    }
    revalidatePath('/riders');
    revalidatePath('/deliveries');
    return id ? 'Rider updated.' : 'Rider added.';
  });
}

export async function deleteRider(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const res = await supabase.from('riders').delete().eq('id', str(formData, 'id')).eq('org_id', user.orgId).select('id');
    if (res.error?.code === '23503') {
      throw new Error('This rider has cash collection history, so they can’t be deleted. Edit them and set “Active” to No instead.');
    }
    checkAffected(res);
    revalidatePath('/riders');
    return 'Rider deleted.';
  });
}

/** Gives the rider an email + password login for the rider app (no email is sent) and links it. */
export async function setRiderPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const id = str(formData, 'id');
    const { data: rider } = await supabase
      .from('riders')
      .select('email, full_name')
      .eq('id', id)
      .eq('org_id', user.orgId)
      .maybeSingle();
    if (!rider) throw new Error('Rider not found.');
    if (!rider.email) throw new Error('Edit the rider and add their email first.');

    const authUserId = await setPasswordLogin(rider.email, str(formData, 'password'), rider.full_name);
    checkAffected(
      await supabase.from('riders').update({ auth_user_id: authUserId }).eq('id', id).eq('org_id', user.orgId).select('id')
    );
    revalidatePath('/riders');
    return `${rider.full_name} can sign in to the rider app with ${rider.email}.`;
  });
}

/** The rider handed their collected cash to the store: clears their balance. */
export async function receiveRiderCash(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const riderId = str(formData, 'id');
    check(
      await supabase
        .from('rider_cash_collections')
        .update({ handed_over_at: new Date().toISOString(), received_by: user.id })
        .eq('rider_id', riderId)
        .eq('org_id', user.orgId)
        .is('handed_over_at', null)
    );
    checkAffected(
      await supabase.from('riders').update({ cash_on_hand: 0 }).eq('id', riderId).eq('org_id', user.orgId).select('id')
    );
    revalidatePath('/riders');
    return 'Cash received.';
  });
}
