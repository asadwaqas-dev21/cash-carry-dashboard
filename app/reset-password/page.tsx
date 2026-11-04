"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Reached from the password-reset email via /auth/callback, which signs the user in first.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");

    setSaving(true);
    setError(null);
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    window.location.href = "/";
  };

  const input = "w-full h-11 px-3 bg-white border-2 border-border rounded-lg text-sm focus:outline-none focus:border-ink-900";

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
      <form onSubmit={save} className="w-full max-w-sm bg-white border border-border rounded-xl p-8 space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight2">Set a new password</h1>
          <p className="text-sm text-ink-500 mt-1">You&apos;ll use it to sign in with your email next time.</p>
        </div>
        {error && <div className="p-3 text-sm text-bad bg-badSoft border border-bad/20 rounded-md">{error}</div>}
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-ink-700 mb-1.5">New password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-xs font-medium text-ink-700 mb-1.5">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={input} />
        </div>
        <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
