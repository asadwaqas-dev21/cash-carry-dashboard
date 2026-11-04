// Form controls shared by the admin forms; usable from Server and Client Components.

export const triggerPrimary =
  "h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5";
export const triggerSecondary =
  "h-8 px-3 rounded-md border border-border bg-white text-sm font-medium hover:bg-ink-200/40 transition flex items-center gap-1.5";
export const triggerLink = "text-brand hover:underline font-medium text-xs";

export function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  );
}

/** A GET search box: submits `?q=` to the current page. */
export function SearchBox({ placeholder, defaultValue }: { placeholder: string; defaultValue?: string }) {
  return (
    <form className="relative">
      <svg className="absolute left-2.5 top-2 text-ink-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="pl-8 pr-3 h-8 w-64 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
      />
    </form>
  );
}

/** Escapes a user search term for a PostgREST `.or()` / `ilike` filter. */
export function searchPattern(q: string) {
  return `%${q.replace(/[%_,()\\*]/g, ' ').trim()}%`;
}

const control =
  "h-9 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition disabled:opacity-60";

type Common = {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
};

function Label({ label, name, required }: Common) {
  return (
    <label className="text-xs font-medium text-ink-700" htmlFor={name}>
      {label}
      {required && <span className="text-bad"> *</span>}
    </label>
  );
}

export function Field({
  type = "text",
  defaultValue,
  placeholder,
  step,
  min,
  ...common
}: Common & {
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label {...common} />
      <input
        id={common.name}
        name={common.name}
        type={type}
        required={common.required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        step={step ?? (type === "number" ? "any" : undefined)}
        min={min}
        className={`${control} ${type === "number" ? "num tabular" : ""}`}
      />
      {common.hint && <div className="text-2xs text-ink-400">{common.hint}</div>}
    </div>
  );
}

export function Select({
  options,
  defaultValue,
  placeholder,
  ...common
}: Common & {
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label {...common} />
      <select id={common.name} name={common.name} required={common.required} defaultValue={defaultValue ?? ""} className={control}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {common.hint && <div className="text-2xs text-ink-400">{common.hint}</div>}
    </div>
  );
}

export function TextArea({ defaultValue, placeholder, ...common }: Common & { defaultValue?: string | null; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label {...common} />
      <textarea
        id={common.name}
        name={common.name}
        required={common.required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        rows={2}
        className="px-3 py-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
      />
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function Hidden({ name, value }: { name: string; value: string | null | undefined }) {
  return <input type="hidden" name={name} value={value ?? ""} />;
}

/** Turns an enum list into select options with readable labels. */
export function enumOptions(values: readonly string[]) {
  return values.map((value) => ({
    value,
    label: value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
}
