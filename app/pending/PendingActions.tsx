"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function PendingActions() {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkAgain = async () => {
    setChecking(true);
    setMessage(null);
    const { data: role, error } = await supabaseBrowser.rpc("claim_dashboard_access");
    if (role && !error) {
      window.location.href = "/";
      return;
    }
    setMessage(error ? error.message : "Still no access. Ask the owner to invite this email.");
    setChecking(false);
  };

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="mt-6">
      {message && <div className="mb-4 p-3 text-sm text-ink-700 bg-canvas border border-border rounded-md">{message}</div>}
      <div className="flex gap-2">
        <button
          onClick={checkAgain}
          disabled={checking}
          className="h-10 px-4 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-700 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check again"}
        </button>
        <button
          onClick={signOut}
          className="h-10 px-4 rounded-lg bg-white border border-border text-sm font-medium hover:border-ink-400"
        >
          Use another account
        </button>
      </div>
    </div>
  );
}
