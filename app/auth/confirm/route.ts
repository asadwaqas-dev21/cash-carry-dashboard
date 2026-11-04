import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';

const EMAIL_LINK_TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup', 'recovery', 'invite', 'email_change'];

// Only same-site paths, so the link can't bounce users to another domain.
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

/**
 * Landing point for links in Supabase emails (sign-in link, password reset,
 * email change, sign-up confirmation). Uses token_hash, so unlike the
 * /auth/callback code flow it works even when the email is opened in a
 * different browser or device than the one that asked for it.
 * Requires the email templates to link here; see supabase/email-templates.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const toLogin = (message: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  if (!tokenHash || !type || !EMAIL_LINK_TYPES.includes(type)) {
    return toLogin('That email link is invalid. Request a new one.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return toLogin('That email link has expired or was already used. Request a new one.');

  const { error: claimError } = await supabase.rpc('claim_dashboard_access');
  if (claimError) console.error('claim_dashboard_access failed:', claimError);

  const fallback = type === 'recovery' ? '/reset-password' : '/';
  return NextResponse.redirect(new URL(safeNext(searchParams.get('next') ?? fallback), request.url));
}
