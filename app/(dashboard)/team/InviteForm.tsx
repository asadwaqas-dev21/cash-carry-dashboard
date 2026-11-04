"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteMember, type TeamActionState } from "./actions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

export default function InviteForm() {
  const [state, action, pending] = useActionState<TeamActionState, FormData>(inviteMember, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="bg-panel border border-border rounded-lg p-4">
      <div className="text-sm font-semibold mb-1">Invite someone</div>
      <div className="text-xs text-ink-500 mb-3">
        They can sign in with Google, an email link or a password using this email, and get the role you pick.
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="name@company.com"
          className="flex-1 min-w-[220px] h-9 px-3 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-ink-900"
        />
        <select name="role" defaultValue="sales_person" className="h-9 px-2 bg-white border border-border rounded-md text-sm">
          {ROLES.map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-4 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 disabled:opacity-50"
        >
          {pending ? "Inviting…" : "Send invite"}
        </button>
      </div>
      {state?.error && <div className="mt-3 text-xs text-bad">{state.error}</div>}
      {state?.success && <div className="mt-3 text-xs text-good">{state.success}</div>}
    </form>
  );
}
