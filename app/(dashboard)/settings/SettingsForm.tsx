"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { initials } from "@/lib/format";
import { saveAvatarUrl, saveLocation, saveNotifications, saveProfile, saveStore, type FormState } from "./actions";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, CURRENCIES, NOTIFICATION_PREFS, TIMEZONES } from "./options";

export type SettingsData = {
  isOwner: boolean;
  userId: string;
  store: { name: string; currency_code: string; timezone: string; default_tax_rate: number };
  location: { id: string; name: string; address_line1: string; city: string; country: string; phone: string };
  profile: {
    fullName: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
    role: Role;
    notifications: Record<string, boolean>;
  };
  account: { providers: string[]; pendingEmail: string | null };
};

type Tab = "store" | "location" | "profile" | "security" | "notifications";

const TABS: { id: Tab; label: string; ownerOnly?: boolean }[] = [
  { id: "store", label: "Store Details", ownerOnly: true },
  { id: "location", label: "Store Location", ownerOnly: true },
  { id: "profile", label: "Personal Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
];

const inputClass =
  "w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition";

export default function SettingsForm({ data }: { data: SettingsData }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabs = TABS.filter((t) => !t.ownerOnly || data.isOwner);
  const requested = searchParams.get("tab") as Tab | null;
  const active: Tab = tabs.some((t) => t.id === requested) ? requested! : tabs[0].id;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight2 mb-1">Settings</h1>
        <p className="text-sm text-ink-500">
          {data.isOwner ? "Manage your store preferences and personal profile." : "Manage your profile, password and notifications."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <nav className="flex flex-col gap-1 sticky top-8" aria-label="Settings sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => router.replace(`/settings?tab=${tab.id}`, { scroll: false })}
                aria-current={active === tab.id ? "page" : undefined}
                className={`text-left px-3 py-2 text-sm font-medium rounded-md flex justify-between items-center transition ${
                  active === tab.id
                    ? "bg-white border border-border shadow-sm text-ink-900"
                    : "text-ink-500 hover:bg-ink-200/50 hover:text-ink-900"
                }`}
              >
                {tab.label}
                {active === tab.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {active === "store" && <StoreSection store={data.store} />}
          {active === "location" && <LocationSection location={data.location} />}
          {active === "profile" && <ProfileSection data={data} />}
          {active === "security" && <SecuritySection account={data.account} />}
          {active === "notifications" && <NotificationsSection prefs={data.profile.notifications} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- shared pieces ---------- */

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-borderMuted">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        <p className="text-sm text-ink-500 mt-1">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Message({ state }: { state: FormState }) {
  if (state?.error) return <span role="alert" className="text-xs text-bad">{state.error}</span>;
  if (state?.success) return <span role="status" className="text-xs text-good">{state.success}</span>;
  return null;
}

function SaveBar({ state, pending, label }: { state: FormState; pending: boolean; label: string }) {
  return (
    <div className="px-6 py-4 bg-canvas border-t border-borderMuted flex items-center justify-end gap-4">
      <Message state={state} />
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-ink-900 text-white text-sm font-medium rounded-md hover:bg-ink-700 transition shadow-sm disabled:opacity-50"
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

/* ---------- owner: store ---------- */

function StoreSection({ store }: { store: SettingsData["store"] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStore, null);
  return (
    <form action={action}>
      <Card title="Store Details" description="Your organization's name and defaults used across the dashboard.">
        <div className="p-6 space-y-5">
          <Field label="Store Name" htmlFor="store-name">
            <input id="store-name" name="name" defaultValue={store.name} required className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Currency" htmlFor="currency">
              <select id="currency" name="currency_code" defaultValue={store.currency_code} className={inputClass}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Default Tax Rate (%)" htmlFor="tax">
              <input id="tax" name="default_tax_rate" type="number" min={0} max={100} step="0.01" defaultValue={store.default_tax_rate} className={inputClass} />
            </Field>
          </div>
          <Field label="Timezone" htmlFor="timezone">
            <select id="timezone" name="timezone" defaultValue={store.timezone} className={inputClass}>
              {!TIMEZONES.some((t) => t.value === store.timezone) && <option value={store.timezone}>{store.timezone}</option>}
              {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <SaveBar state={state} pending={pending} label="Save Store Details" />
      </Card>
    </form>
  );
}

function LocationSection({ location }: { location: SettingsData["location"] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLocation, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={location.id} />
      <Card title="Store Location" description="Main branch address and phone, used for deliveries and receipts.">
        <div className="p-6 space-y-5">
          <Field label="Location Name" htmlFor="loc-name">
            <input id="loc-name" name="name" defaultValue={location.name} required className={inputClass} />
          </Field>
          <Field label="Address" htmlFor="loc-address">
            <input id="loc-address" name="address_line1" defaultValue={location.address_line1} placeholder="Shop no., street, area" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Field label="City" htmlFor="loc-city">
              <input id="loc-city" name="city" defaultValue={location.city} className={inputClass} />
            </Field>
            <Field label="Country" htmlFor="loc-country">
              <input id="loc-country" name="country" defaultValue={location.country} className={inputClass} />
            </Field>
            <Field label="Phone" htmlFor="loc-phone">
              <input id="loc-phone" name="phone" type="tel" defaultValue={location.phone} className={inputClass} />
            </Field>
          </div>
        </div>
        <SaveBar state={state} pending={pending} label="Save Location" />
      </Card>
    </form>
  );
}

/* ---------- everyone: profile ---------- */

function ProfileSection({ data }: { data: SettingsData }) {
  const { profile, account } = data;
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarState, setAvatarState] = useState<FormState>(null);
  const [uploading, setUploading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailState, setEmailState] = useState<FormState>(null);
  const [emailPending, setEmailPending] = useState(false);

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) return setAvatarState({ error: "Choose an image file." });
    if (file.size > AVATAR_MAX_BYTES) return setAvatarState({ error: "Image must be 2 MB or smaller." });

    setUploading(true);
    setAvatarState(null);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `avatars/${data.userId}/${Date.now()}.${ext}`;
    const { error } = await supabaseBrowser.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type });
    if (error) {
      setAvatarState({ error: error.message });
    } else {
      const { data: urlData } = supabaseBrowser.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      setAvatarState(await saveAvatarUrl(urlData.publicUrl));
      router.refresh();
    }
    setUploading(false);
  };

  const removeAvatar = async () => {
    setUploading(true);
    setAvatarState(await saveAvatarUrl(null));
    router.refresh();
    setUploading(false);
  };

  const changeEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setEmailState({ error: "Enter a valid email address." });
    if (email === profile.email.toLowerCase()) return setEmailState({ error: "That's already your email." });

    setEmailPending(true);
    const { error } = await supabaseBrowser.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?tab=profile")}` }
    );
    setEmailState(error ? { error: error.message } : { success: `Confirm the change from the link sent to ${email}.` });
    setEmailPending(false);
    if (!error) setNewEmail("");
  };

  return (
    <>
      <form action={action}>
        <Card title="Personal Profile" description="How you appear to your team in the dashboard.">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-5">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full object-cover shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand text-white text-xl font-semibold flex items-center justify-center shadow-sm">
                  {initials(profile.fullName)}
                </div>
              )}
              <div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-border text-ink-900 text-sm font-medium rounded-md hover:border-ink-400 transition shadow-sm disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Change Photo"}
                  </button>
                  {profile.avatarUrl && (
                    <button type="button" disabled={uploading} onClick={removeAvatar} className="px-3 py-1.5 text-sm text-ink-500 hover:text-bad transition">
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) uploadAvatar(file);
                  }}
                />
                <p className="text-xs text-ink-400 mt-2">JPG, PNG, GIF or WebP. Max 2 MB.</p>
                <div className="mt-1"><Message state={avatarState} /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Full Name" htmlFor="full-name">
                <input id="full-name" name="full_name" defaultValue={profile.fullName} required className={inputClass} />
              </Field>
              <Field label="Role" htmlFor="role">
                <input id="role" value={ROLE_LABELS[profile.role]} disabled className="w-full px-3 py-2 bg-ink-200/50 border border-border rounded-md text-sm text-ink-500 cursor-not-allowed" />
              </Field>
            </div>
            <Field label="Phone" htmlFor="phone">
              <input id="phone" name="phone" type="tel" defaultValue={profile.phone} placeholder="03XX XXXXXXX" className={inputClass} />
            </Field>
          </div>
          <SaveBar state={state} pending={pending} label="Update Profile" />
        </Card>
      </form>

      <Card title="Email Address" description="Used to sign in and for notifications. Changing it needs confirmation by email.">
        <div className="p-6 space-y-4">
          <div className="text-sm">
            Current: <span className="font-medium">{profile.email || "-"}</span>
            {account.pendingEmail && (
              <span className="ml-2 text-xs text-warn">Waiting for confirmation of {account.pendingEmail}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@company.com"
              aria-label="New email address"
              className={`${inputClass} flex-1 min-w-[220px]`}
            />
            <button
              type="button"
              onClick={changeEmail}
              disabled={emailPending}
              className="px-4 py-2 bg-white border border-border text-sm font-medium rounded-md hover:border-ink-400 transition disabled:opacity-50"
            >
              {emailPending ? "Sending…" : "Change Email"}
            </button>
          </div>
          <Message state={emailState} />
        </div>
      </Card>
    </>
  );
}

/* ---------- everyone: security ---------- */

const PROVIDER_LABELS: Record<string, string> = { google: "Google", email: "Email & password / email link" };

function SecuritySection({ account }: { account: SettingsData["account"] }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordState, setPasswordState] = useState<FormState>(null);
  const [saving, setSaving] = useState(false);
  const [sessionState, setSessionState] = useState<FormState>(null);
  const [signingOut, setSigningOut] = useState<null | "others" | "global">(null);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setPasswordState({ error: "Use at least 8 characters." });
    if (password !== confirm) return setPasswordState({ error: "The two passwords don't match." });

    setSaving(true);
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    setPasswordState(error ? { error: error.message } : { success: "Password updated." });
    setSaving(false);
    if (!error) {
      setPassword("");
      setConfirm("");
    }
  };

  const signOut = async (scope: "others" | "global") => {
    setSigningOut(scope);
    const { error } = await supabaseBrowser.auth.signOut({ scope });
    if (scope === "global" && !error) {
      window.location.href = "/login";
      return;
    }
    setSessionState(error ? { error: error.message } : { success: "Signed out of all other devices." });
    setSigningOut(null);
  };

  return (
    <>
      <Card title="Sign-in Methods" description="Ways you can sign in to this account.">
        <div className="p-6 flex flex-wrap gap-2">
          {account.providers.length === 0 && <span className="text-sm text-ink-500">-</span>}
          {account.providers.map((provider) => (
            <span key={provider} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas border border-border text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-good" /> {PROVIDER_LABELS[provider] ?? provider}
            </span>
          ))}
        </div>
      </Card>

      <form onSubmit={changePassword}>
        <Card
          title={account.providers.includes("email") ? "Change Password" : "Set a Password"}
          description="Lets you sign in with your email and password as well."
        >
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="New Password" htmlFor="new-password">
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Confirm Password" htmlFor="confirm-password">
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <SaveBar state={passwordState} pending={saving} label="Update Password" />
        </Card>
      </form>

      <Card title="Active Sessions" description="Lost a phone or used a shared computer? Sign out everywhere else.">
        <div className="p-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => signOut("others")}
            disabled={signingOut !== null}
            className="px-4 py-2 bg-white border border-border text-sm font-medium rounded-md hover:border-ink-400 transition disabled:opacity-50"
          >
            {signingOut === "others" ? "Signing out…" : "Sign out other devices"}
          </button>
          <button
            onClick={() => signOut("global")}
            disabled={signingOut !== null}
            className="px-4 py-2 text-sm font-medium rounded-md text-bad hover:bg-badSoft transition disabled:opacity-50"
          >
            {signingOut === "global" ? "Signing out…" : "Sign out everywhere"}
          </button>
          <Message state={sessionState} />
        </div>
      </Card>
    </>
  );
}

/* ---------- everyone: notifications ---------- */

function NotificationsSection({ prefs }: { prefs: Record<string, boolean> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveNotifications, null);
  return (
    <form action={action}>
      <Card title="Notifications" description="Choose which alerts you want to receive.">
        <div className="divide-y divide-borderMuted">
          {NOTIFICATION_PREFS.map((pref) => (
            <label key={pref.key} className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-canvas/60">
              <div>
                <div className="text-sm font-medium text-ink-900">{pref.label}</div>
                <div className="text-xs text-ink-500 mt-0.5">{pref.hint}</div>
              </div>
              <span className="relative inline-flex shrink-0">
                <input type="checkbox" name={pref.key} defaultChecked={prefs[pref.key] ?? true} className="peer sr-only" />
                <span className="w-9 h-5 rounded-full bg-ink-200 peer-checked:bg-brand transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          ))}
        </div>
        <SaveBar state={state} pending={pending} label="Save Preferences" />
      </Card>
    </form>
  );
}
