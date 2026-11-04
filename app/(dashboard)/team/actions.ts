'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { ROLES, type Role } from '@/lib/roles';

export type TeamActionState = { error?: string; success?: string } | null;

function parseRole(value: FormDataEntryValue | null): Role {
  if (typeof value === 'string' && (ROLES as string[]).includes(value)) return value as Role;
  throw new Error('Choose a valid role.');
}

/** Lets an email join the dashboard with a role; they get access the first time they sign in with it. */
export async function inviteMember(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const { user, supabase } = await requireRole('owner');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };

  let role: Role;
  try {
    role = parseRole(formData.get('role'));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase
    .from('user_invites')
    .upsert(
      { org_id: user.orgId, email, role, invited_by: user.id, accepted_at: null, accepted_by: null },
      { onConflict: 'org_id,email' }
    );
  if (error) return { error: error.message };

  revalidatePath('/team');
  return { success: `${email} can now sign in as ${role === 'owner' ? 'an owner' : 'a sales person'}.` };
}

export async function revokeInvite(formData: FormData) {
  const { user, supabase } = await requireRole('owner');
  const { error } = await supabase
    .from('user_invites')
    .delete()
    .eq('id', String(formData.get('id')))
    .eq('org_id', user.orgId);
  if (error) throw new Error(error.message);
  revalidatePath('/team');
}

export async function changeMemberRole(formData: FormData) {
  const { user, supabase } = await requireRole('owner');
  const memberId = String(formData.get('id'));
  if (memberId === user.id) throw new Error("You can't change your own role.");

  const { error } = await supabase
    .from('profiles')
    .update({ role: parseRole(formData.get('role')) })
    .eq('id', memberId)
    .eq('org_id', user.orgId);
  if (error) throw new Error(error.message);
  revalidatePath('/team');
}

export async function setMemberActive(formData: FormData) {
  const { user, supabase } = await requireRole('owner');
  const memberId = String(formData.get('id'));
  if (memberId === user.id) throw new Error("You can't turn off your own access.");

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: formData.get('active') === 'true' })
    .eq('id', memberId)
    .eq('org_id', user.orgId);
  if (error) throw new Error(error.message);
  revalidatePath('/team');
}
