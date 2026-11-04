'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, nextCode, oneOf, optAmount, optStr, str, type ActionState } from '@/lib/action-state';
import { STAFF_STATUSES } from '@/lib/enums';
import { ROLES } from '@/lib/roles';

/** Employee records (HR). Dashboard sign-in access is managed separately under Team & Access. */
export async function saveStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const id = str(formData, 'id');
    const fullName = str(formData, 'full_name');
    if (!fullName) throw new Error('Enter the staff member’s name.');

    const fields = {
      full_name: fullName,
      employee_code: str(formData, 'employee_code') || (await nextCode(supabase, 'staff', 'employee_code', user.orgId, 'EMP')),
      email: optStr(formData, 'email')?.toLowerCase() ?? null,
      phone: optStr(formData, 'phone'),
      role: oneOf(formData, 'role', ROLES, 'role'),
      status: oneOf(formData, 'status', STAFF_STATUSES, 'status'),
      hire_date: optStr(formData, 'hire_date'),
      salary: optAmount(formData, 'salary', 'Salary'),
      notes: optStr(formData, 'notes'),
    };

    if (id) {
      checkAffected(await supabase.from('staff').update(fields).eq('id', id).eq('org_id', user.orgId).select('id'));
    } else {
      check(await supabase.from('staff').insert({ ...fields, org_id: user.orgId }));
    }
    revalidatePath('/staff');
    return id ? 'Staff member updated.' : 'Staff member added.';
  });
}

export async function deleteStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    checkAffected(
      await supabase.from('staff').delete().eq('id', str(formData, 'id')).eq('org_id', user.orgId).select('id')
    );
    revalidatePath('/staff');
    return 'Staff member deleted.';
  });
}
