'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseUrl } from '@/lib/supabase-env';
import { AVATAR_BUCKET, CURRENCIES, NOTIFICATION_PREFS, TIMEZONES } from './options';

export type FormState = { error?: string; success?: string } | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

export async function saveStore(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireRole('owner');

  const name = text(formData, 'name');
  const currency = text(formData, 'currency_code');
  const timezone = text(formData, 'timezone');
  const taxRate = Number(text(formData, 'default_tax_rate'));

  if (!name) return { error: 'Store name is required.' };
  if (!CURRENCIES.some((c) => c.code === currency)) return { error: 'Choose a currency from the list.' };
  if (!TIMEZONES.some((t) => t.value === timezone)) return { error: 'Choose a timezone from the list.' };
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return { error: 'Tax rate must be between 0 and 100.' };

  const { error } = await supabase
    .from('organizations')
    .update({ name, currency_code: currency, timezone, default_tax_rate: taxRate })
    .eq('id', user.orgId);
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: 'Store details saved.' };
}

export async function saveLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireRole('owner');

  const id = text(formData, 'id');
  const fields = {
    name: text(formData, 'name'),
    address_line1: text(formData, 'address_line1') || null,
    city: text(formData, 'city') || null,
    country: text(formData, 'country') || 'Pakistan',
    phone: text(formData, 'phone') || null,
  };
  if (!fields.name) return { error: 'Location name is required.' };

  const { error } = id
    ? await supabase.from('locations').update(fields).eq('id', id).eq('org_id', user.orgId)
    : await supabase.from('locations').insert({ ...fields, org_id: user.orgId, code: 'MAIN', type: 'warehouse' });
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { success: 'Location saved.' };
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireRole();

  const fullName = text(formData, 'full_name');
  const phone = text(formData, 'phone') || null;
  if (!fullName) return { error: 'Your name is required.' };

  const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: 'Profile updated.' };
}

/** Saves an avatar the browser already uploaded to storage, or clears it with null. */
export async function saveAvatarUrl(url: string | null): Promise<FormState> {
  const { user, supabase } = await requireRole();

  const allowedPrefix = `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/avatars/${user.id}/`;
  if (url !== null && !url.startsWith(allowedPrefix)) return { error: 'That image location is not allowed.' };

  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: url ? 'Photo updated.' : 'Photo removed.' };
}

export async function saveNotifications(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireRole();

  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .maybeSingle();
  if (readError) return { error: readError.message };

  const notifications = Object.fromEntries(NOTIFICATION_PREFS.map(({ key }) => [key, formData.get(key) === 'on']));
  const preferences = { ...(profile?.preferences ?? {}), notifications };

  const { error } = await supabase.from('profiles').update({ preferences }).eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/settings');
  return { success: 'Notification preferences saved.' };
}
