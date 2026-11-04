"use client";

import { useActionState, useEffect } from "react";
import type { ActionState, FormAction } from "@/lib/action-state";

/** A one-click Server Action (delete, approve, …) with a confirm prompt. Errors show in an alert. */
export default function ConfirmButton({
  action,
  fields,
  confirm,
  children,
  className = "text-bad hover:underline font-medium text-xs",
}: {
  action: FormAction;
  fields: Record<string, string>;
  confirm?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.error) window.alert(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
        {pending ? "…" : children}
      </button>
    </form>
  );
}
