'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { ROLES, type Role } from '@/lib/roles';
import { attempt, oneOf, str, type ActionState } from '@/lib/action-state';
import { adminClient, setPasswordLogin } from '@/lib/supabase-admin';

function parseRole(value: FormDataEntryValue | null): Role {
  if (typeof value === 'string' && (ROLES as string[]).includes(value)) return value as Role;
  throw new Error('Choose a valid role.');
}

/** Creates a dashboard login (email + password, no email sent) with a role in the owner's store. */
export async function createMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const fullName = str(formData, 'full_name');
    const email = str(formData, 'email').toLowerCase();
    const role = oneOf(formData, 'role', ROLES, 'role');
    if (!fullName) throw new Error('Enter their name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

    const userId = await setPasswordLogin(email, str(formData, 'password'), fullName);

    // The service role writes the profile: owners can't insert profiles for others through RLS.
    const admin = adminClient();
    const { data: existing } = await admin.from('profiles').select('org_id').eq('id', userId).maybeSingle();
    if (existing && existing.org_id !== user.orgId) throw new Error('This email belongs to another store.');
    if (existing) {
      // As the owner, so the role-change trigger sees an owner making the change.
      const { error } = await supabase.from('profiles').update({ role, full_name: fullName, is_active: true }).eq('id', userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin
        .from('profiles')
        .insert({ id: userId, org_id: user.orgId, full_name: fullName, email, role, last_seen_at: null });
      if (error) throw new Error(error.message);
    }
    await supabase.from('user_invites').delete().eq('org_id', user.orgId).eq('email', email);

    revalidatePath('/team');
    return `${fullName} can now sign in with ${email} and the password you set.`;
  });
}

/** Sets a new password for a member of the owner's store. */
export async function setMemberPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const { data: member } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', str(formData, 'id'))
      .eq('org_id', user.orgId)
      .maybeSingle();
    if (!member?.email) throw new Error('Member not found.');
    await setPasswordLogin(member.email, str(formData, 'password'), member.full_name);
    return `New password set for ${member.full_name}.`;
  });
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
