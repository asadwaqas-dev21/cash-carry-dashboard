'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, oneOf, optAmount, optStr, str, type ActionState } from '@/lib/action-state';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '@/lib/enums';

/** Creates or updates a customer and their default delivery address. Owners and sales staff. */
export async function saveCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner', 'sales_person');
    const id = str(formData, 'id');
    const displayName = str(formData, 'display_name');
    if (!displayName) throw new Error('Enter the customer name.');
    const type = oneOf(formData, 'type', CUSTOMER_TYPES, 'customer type');

    const fields = {
      display_name: displayName,
      type,
      status: oneOf(formData, 'status', CUSTOMER_STATUSES, 'status'),
      phone: optStr(formData, 'phone'),
      email: optStr(formData, 'email'),
      business_name: type === 'business' ? optStr(formData, 'business_name') : null,
      credit_limit: optAmount(formData, 'credit_limit', 'Credit limit') ?? 0,
      wholesale_enabled: type === 'business',
      notes: optStr(formData, 'notes'),
    };

    let customerId = id;
    if (id) {
      checkAffected(await supabase.from('customers').update(fields).eq('id', id).eq('org_id', user.orgId).select('id'));
    } else {
      const created = check(
        await supabase.from('customers').insert({ ...fields, org_id: user.orgId }).select('id').single()
      ) as { id: string };
      customerId = created.id;
    }

    const addressLine = str(formData, 'address_line1');
    const city = str(formData, 'city');
    if (addressLine || city) {
      if (!addressLine || !city) throw new Error('Enter both the street address and the city, or leave both empty.');
      const address = { address_line1: addressLine, city, phone: fields.phone, recipient_name: displayName };
      const addressId = str(formData, 'address_id');
      if (addressId) {
        check(await supabase.from('customer_addresses').update(address).eq('id', addressId).eq('org_id', user.orgId));
      } else {
        check(
          await supabase
            .from('customer_addresses')
            .insert({ ...address, org_id: user.orgId, customer_id: customerId, is_default: true })
        );
      }
    }

    revalidatePath('/customers');
    return id ? 'Customer updated.' : 'Customer added.';
  });
}

/** Past orders keep their totals; the customer link on them is cleared (ON DELETE SET NULL). */
export async function deleteCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    checkAffected(
      await supabase.from('customers').delete().eq('id', str(formData, 'id')).eq('org_id', user.orgId).select('id')
    );
    revalidatePath('/customers');
    return 'Customer deleted.';
  });
}
