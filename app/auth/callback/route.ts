import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';

// Only same-site paths, so the link can't bounce users to another domain.
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

/**
 * Landing point for Google sign-in, email sign-in links and password-reset
 * links: swaps the one-time code for a session cookie, links the account to
 * a pending invite, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const toLogin = (message: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));

  const providerError = searchParams.get('error_description') || searchParams.get('error');
  if (providerError) return toLogin(providerError);

  const code = searchParams.get('code');
  if (!code) return toLogin('That sign-in link is invalid or has expired.');

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // The code flow only works in the browser that started it (its verifier lives in a cookie there).
    const message = /code verifier/i.test(error.message)
      ? 'Open the link in the same browser you signed in from, or request a new link.'
      : error.message;
    return toLogin(message);
  }

  const { error: claimError } = await supabase.rpc('claim_dashboard_access');
  if (claimError) console.error('claim_dashboard_access failed:', claimError);

  return NextResponse.redirect(new URL(safeNext(searchParams.get('next')), request.url));
}
