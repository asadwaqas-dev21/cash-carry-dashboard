"use client";

import { useEffect, useState } from "react";
import ActionForm from "./ActionForm";
import type { FormAction } from "@/lib/action-state";
import { triggerPrimary } from "./fields";

/** A button that opens a dialog holding a Server Action form; closes when the action succeeds. */
export default function FormModal({
  action,
  title,
  description,
  trigger,
  triggerClassName = triggerPrimary,
  submitLabel,
  danger,
  wide = false,
  children,
}: {
  action: FormAction;
  title: string;
  description?: string;
  trigger: React.ReactNode;
  triggerClassName?: string;
  submitLabel?: string;
  danger?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // A new key per opening resets the form and any previous error.
  const [instance, setInstance] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => {
          setInstance((n) => n + 1);
          setOpen(true);
        }}
      >
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className={`bg-panel border border-border rounded-xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] flex flex-col overflow-hidden text-left`}>
            <div className="px-5 py-4 border-b border-borderMuted flex items-start justify-between bg-canvas shrink-0">
              <div>
                <h3 className="font-semibold text-ink-900">{title}</h3>
                {description && <div className="text-xs text-ink-500 mt-0.5">{description}</div>}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-900 transition" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <ActionForm
                key={instance}
                action={action}
                submitLabel={submitLabel}
                danger={danger}
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              >
                {children}
              </ActionForm>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
