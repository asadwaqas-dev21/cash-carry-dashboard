import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from './supabase-env';

// Server-only: the service role key bypasses RLS. Never import this from a client component.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

/** Whether the owner can create accounts and set passwords (no emails involved). */
export const hasAdminKey = Boolean(supabaseUrl && serviceKey);

export const MISSING_ADMIN_KEY =
  'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Project Settings → API keys) and restart the app.';

export function adminClient(): SupabaseClient {
  if (!hasAdminKey) throw new Error(MISSING_ADMIN_KEY);
  return createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function checkPassword(password: string) {
  if (password.length < 8) throw new Error('Use a password of at least 8 characters.');
}

async function findUserIdByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/**
 * Gives `email` a confirmed email + password login without sending any email:
 * creates the account, or sets a new password if the email already has one.
 * Returns the auth user id.
 */
export async function setPasswordLogin(email: string, password: string, fullName?: string) {
  checkPassword(password);
  const admin = adminClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (!error) return data.user.id;
  if (error.code !== 'email_exists' && !/already (been )?registered|already exists/i.test(error.message)) {
    throw new Error(error.message);
  }

  const existingId = await findUserIdByEmail(admin, normalized);
  if (!existingId) throw new Error(error.message);
  const { error: updateError } = await admin.auth.admin.updateUserById(existingId, { password, email_confirm: true });
  if (updateError) throw new Error(updateError.message);
  return existingId;
}
