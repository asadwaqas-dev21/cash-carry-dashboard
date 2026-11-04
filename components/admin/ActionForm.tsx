"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionState, FormAction } from "@/lib/action-state";

/** A form bound to a Server Action, with the action's error/success shown under it. */
export default function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  danger = false,
  resetOnSuccess = false,
  onSuccess,
  onCancel,
  className = "",
}: {
  action: FormAction;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  danger?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.success) return;
    if (resetOnSuccess) formRef.current?.reset();
    onSuccess?.();
    // onSuccess is a fresh closure each render; only react to new results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      // Submitting via a transition (not the form action) keeps typed values if the action returns an error.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={`flex flex-col gap-4 ${className}`}
    >
      {children}
      {state?.error && (
        <div className="p-2.5 text-xs text-bad bg-badSoft border border-bad/20 rounded-md">{state.error}</div>
      )}
      {state?.success && !onSuccess && (
        <div className="p-2.5 text-xs text-good bg-goodSoft border border-good/20 rounded-md">{state.success}</div>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-9 px-4 rounded-md border border-border bg-white text-sm font-medium hover:bg-ink-200/40 transition">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className={`h-9 px-4 rounded-md text-white text-sm font-medium transition disabled:opacity-50 ${danger ? "bg-bad hover:bg-bad/90" : "bg-ink-900 hover:bg-ink-700"}`}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
