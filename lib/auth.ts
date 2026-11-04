import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase';
import { hasSupabase } from './supabase-env';
import { canAccess, type Role } from './roles';

export type DashboardUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  orgId: string;
};

type AuthState =
  | { status: 'signed-out' }
  // Signed in, but no active profile yet (not invited, or deactivated).
  | { status: 'pending'; email: string }
  | { status: 'active'; user: DashboardUser };

const DEMO_OWNER: DashboardUser = {
  id: 'demo-user',
  email: 'demo@local.test',
  fullName: 'Demo Owner',
  avatarUrl: null,
  role: 'owner',
  orgId: 'demo-org',
};

/** The current user and their dashboard profile, verified with Supabase Auth. Cached per request. */
export const getAuthState = cache(async (): Promise<AuthState> => {
  if (!hasSupabase) return { status: 'active', user: DEMO_OWNER };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'signed-out' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, full_name, avatar_url, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return { status: 'pending', email: user.email ?? '' };

  return {
    status: 'active',
    user: {
      id: user.id,
      email: user.email ?? '',
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      role: profile.role as Role,
      orgId: profile.org_id,
    },
  };
});

/** For layouts and pages: redirects to /login or /pending unless the user has an active profile. */
export async function requireUser(): Promise<DashboardUser> {
  const state = await getAuthState();
  if (state.status === 'signed-out') redirect('/login');
  if (state.status === 'pending') redirect('/pending');
  return state.user;
}

/**
 * For pages: the user must be allowed to open `path` (see PAGE_ACCESS).
 * Returns the user and a Supabase client acting as them.
 */
export async function requirePageAccess(path: string) {
  const user = await requireUser();
  if (!canAccess(user.role, path)) redirect(`/?denied=${encodeURIComponent(path)}`);
  return { user, supabase: await createClient() };
}

/** For Server Actions: throws unless the user is active and has one of `roles` (any role if none given). */
export async function requireRole(...roles: Role[]) {
  const state = await getAuthState();
  if (state.status !== 'active') throw new Error('You must be signed in to do this.');
  if (roles.length > 0 && !roles.includes(state.user.role)) {
    throw new Error('You do not have permission to do this.');
  }
  return { user: state.user, supabase: await createClient() };
}
