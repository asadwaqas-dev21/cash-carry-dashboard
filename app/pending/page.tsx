import { redirect } from 'next/navigation';
import { getAuthState } from '@/lib/auth';
import PendingActions from './PendingActions';

export default async function PendingPage() {
  const state = await getAuthState();
  if (state.status === 'signed-out') redirect('/login');
  if (state.status === 'active') redirect('/');

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md bg-white border border-border rounded-xl p-8">
        <div className="w-10 h-10 rounded-lg bg-warnSoft text-warn flex items-center justify-center mb-5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight2">Waiting for access</h1>
        <p className="text-sm text-ink-500 mt-2">
          You&apos;re signed in as <span className="font-medium text-ink-900">{state.email}</span>, but this account
          doesn&apos;t have dashboard access yet, or it has been turned off.
        </p>
        <p className="text-sm text-ink-500 mt-3">
          Ask the owner to invite this email from <span className="font-medium text-ink-700">Team &amp; Access</span>,
          then check again.
        </p>
        <PendingActions />
      </div>
    </div>
  );
}
