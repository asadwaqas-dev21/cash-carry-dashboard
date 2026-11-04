"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Where to land after sign-in; only same-site paths are allowed.
function nextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// Google, email links and password resets come back through /auth/callback.
function callbackUrl(next = nextPath()) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

type Pending = null | "password" | "google" | "link" | "reset";
type Method = "password" | "link";

const activityFeed = [
  { icon: "pos", text: "POS sale · R-4831", amount: "Rs 1,262" },
  { icon: "app", text: "App order · #4832", amount: "Rs 348" },
  { icon: "stock", text: "Stock count completed", amount: "" },
  { icon: "rider", text: "Rider #12 picked up 4 orders", amount: "" },
  { icon: "pos", text: "POS sale · R-4830", amount: "Rs 6,120" },
  { icon: "app", text: "App order · #4831", amount: "Rs 2,847" },
];

function Spinner({ className = "text-white" }: { className?: string }) {
  return (
    <svg className={`animate-spin h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function FeedIcon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    pos: <><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
    app: <rect x="5" y="2" width="14" height="20" rx="2" />,
    rider: <><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></>,
    stock: <><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" /><path d="M3.3 7 12 12l8.7-5" /></>,
  };
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {paths[type]}
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// The user's role comes from their profile in the database, never from this form.
function LoginForm() {
  // Errors passed back from /auth/callback, e.g. a cancelled Google sign-in.
  const callbackError = useSearchParams().get("error");
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(callbackError);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [feed, setFeed] = useState(() => activityFeed.slice(0, 3).map((item, i) => ({ ...item, id: i })));

  useEffect(() => {
    let index = 3;
    const interval = setInterval(() => {
      const item = { ...activityFeed[index % activityFeed.length], id: index };
      index++;
      setFeed((prev) => [item, ...prev].slice(0, 3));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const start = (kind: Pending) => {
    setLoading(kind);
    setError(null);
    setNotice(null);
  };

  const fail = (message?: string) => {
    setError(!message || message === "{}" ? "Something went wrong. Please try again." : message);
    setLoading(null);
  };

  const requireEmail = () => {
    if (email.trim()) return true;
    setError("Enter your work email first.");
    return false;
  };

  const handlePassword = async () => {
    start("password");
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) return fail(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);

    // Links the account to a pending invite (or makes the very first user the owner).
    await supabaseBrowser.rpc("claim_dashboard_access");
    window.location.href = nextPath();
  };

  const handleMagicLink = async () => {
    if (!requireEmail()) return;
    start("link");
    const { error } = await supabaseBrowser.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) return fail(error.message);
    setNotice(`Check ${email} — we sent you a sign-in link. Open it on this device.`);
    setLoading(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "password") handlePassword();
    else handleMagicLink();
  };

  const handleGoogle = async () => {
    start("google");
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(), queryParams: { prompt: "select_account" } },
    });
    // On success the browser is already on its way to Google.
    if (error) fail(error.message);
  };

  const handleForgotPassword = async () => {
    if (!requireEmail()) return;
    start("reset");
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl("/reset-password"),
    });
    if (error) return fail(error.message);
    setNotice(`If ${email} has an account, a password reset link is on its way.`);
    setLoading(null);
  };

  const busy = loading !== null;
  const field =
    "group flex items-center gap-3 h-12 px-4 rounded-xl bg-white border border-border shadow-[0_1px_2px_rgba(12,10,9,0.04)] transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10";

  return (
    <>
      <style>{`
        .login-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at 60% 40%, black 30%, transparent 75%);
        }
        .feed-in { animation: feedIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes feedIn { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: none; } }
        .float-slow { animation: floaty 7s ease-in-out infinite; }
        .float-slower { animation: floaty 9s ease-in-out infinite reverse; }
        @keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .rise { animation: rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .feed-in, .float-slow, .float-slower, .rise { animation: none; }
        }
      `}</style>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-canvas overflow-x-hidden">
        {/* ========== FORM ========== */}
        <div className="relative min-w-0 flex flex-col px-5 sm:px-10 py-8">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-[0.12] pointer-events-none" style={{ background: "#EA580C" }} />

          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-lg shadow-brand/25">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h20l-2 6H4z" /><path d="M4 9v11h16V9" /><line x1="12" y1="12" x2="12" y2="16" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="text-md font-semibold tracking-tight2">Cash &amp; Carry</div>
              <div className="text-2xs text-ink-400 mt-1">Operations</div>
            </div>
          </div>

          <div className="relative flex-1 flex items-center justify-center py-10">
            <div className="w-full max-w-[380px] rise">
              <h1 className="text-3xl font-semibold tracking-tight3 leading-tight">Welcome back</h1>
              <p className="text-base text-ink-500 mt-2">Sign in to manage orders, stock and sales.</p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="mt-8 w-full h-12 rounded-xl bg-white border border-border shadow-[0_1px_2px_rgba(12,10,9,0.06)] text-md font-medium flex items-center justify-center gap-3 transition hover:-translate-y-px hover:shadow-md hover:border-ink-300 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading === "google" ? (
                  <Spinner className="text-ink-500" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {loading === "google" ? "Redirecting to Google…" : "Continue with Google"}
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-ink-400">or use your email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Method switch */}
              <div role="tablist" aria-label="Sign-in method" className="relative grid grid-cols-2 p-1 rounded-xl bg-ink-200/40 mb-5">
                <span
                  aria-hidden
                  className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out ${method === "link" ? "translate-x-full" : ""}`}
                />
                {(["password", "link"] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={method === m}
                    onClick={() => { setMethod(m); setError(null); setNotice(null); }}
                    className={`relative z-10 h-9 text-sm font-medium rounded-lg transition-colors ${method === m ? "text-ink-900" : "text-ink-500 hover:text-ink-700"}`}
                  >
                    {m === "password" ? "Password" : "Email link"}
                  </button>
                ))}
              </div>

              {error && (
                <div role="alert" className="mb-4 flex gap-2.5 p-3 text-sm text-bad bg-badSoft border border-bad/15 rounded-xl rise">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-px"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {error}
                </div>
              )}
              {notice && (
                <div role="status" className="mb-4 flex gap-2.5 p-3 text-sm text-good bg-goodSoft border border-good/15 rounded-xl rise">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  {notice}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-ink-700 mb-1.5">Work email</label>
                  <div className={field}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-400 group-focus-within:text-brand transition-colors shrink-0">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="flex-1 h-full bg-transparent text-md placeholder:text-ink-300 focus:outline-none"
                    />
                  </div>
                </div>

                {method === "password" && (
                  <div className="rise">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-xs font-medium text-ink-700">Password</label>
                      <button type="button" onClick={handleForgotPassword} disabled={busy} className="text-xs text-brand hover:text-brand-hover font-medium transition disabled:opacity-50">
                        {loading === "reset" ? "Sending…" : "Forgot password?"}
                      </button>
                    </div>
                    <div className={field}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-400 group-focus-within:text-brand transition-colors shrink-0">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="flex-1 h-full bg-transparent text-md placeholder:text-ink-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="w-8 h-8 -mr-1.5 rounded-lg hover:bg-canvas flex items-center justify-center text-ink-400 hover:text-ink-700 transition shrink-0"
                      >
                        {showPassword ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {method === "link" && (
                  <p className="text-xs text-ink-500 rise">We&apos;ll email you a one-time link. No password needed.</p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="group w-full h-12 mt-2 rounded-xl bg-gradient-to-b from-brand to-brand-hover text-white text-md font-semibold shadow-lg shadow-brand/25 flex items-center justify-center gap-2 transition hover:-translate-y-px hover:shadow-xl hover:shadow-brand/30 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading === "password" || loading === "link" ? (
                    <Spinner />
                  ) : (
                    <>
                      <span>{method === "password" ? "Sign in" : "Email me a sign-in link"}</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="transition-transform group-hover:translate-x-0.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-start gap-3 p-3.5 rounded-xl bg-white/70 border border-borderMuted">
                <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                </div>
                <p className="text-xs text-ink-500 leading-relaxed">
                  <span className="font-medium text-ink-700">New to the team?</span> Ask the owner to invite your email, then sign in with it. Your role decides what you can see.
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between text-2xs text-ink-400">
            <span>© 2026 Kirana Cash &amp; Carry</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-good" /> All systems normal
            </span>
          </div>
        </div>

        {/* ========== SHOWCASE ========== */}
        <div className="hidden lg:flex relative overflow-hidden bg-ink-900 text-white m-3 rounded-[28px]">
          <div className="absolute inset-0 login-grid" />
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, #EA580C 0%, transparent 70%)" }} />
          <div className="absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #F59E0B 0%, transparent 70%)" }} />

          <div className="relative flex flex-col justify-between w-full p-12">
            <div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> Live store activity
            </div>

            <div className="relative h-[340px] my-8">
              {/* Sales card */}
              <div className="float-slow absolute left-0 top-0 w-[290px] p-5 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="text-xs text-white/60">Today&apos;s sales</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight3 num">Rs 248,930</div>
                <div className="mt-1 text-xs text-emerald-400">↑ 12.4% vs yesterday</div>
                <svg viewBox="0 0 240 60" className="mt-4 w-full h-14" aria-hidden>
                  <defs>
                    <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#EA580C" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 48 L30 42 L60 45 L90 30 L120 34 L150 20 L180 24 L210 10 L240 14 L240 60 L0 60 Z" fill="url(#spark)" />
                  <path d="M0 48 L30 42 L60 45 L90 30 L120 34 L150 20 L180 24 L210 10 L240 14" fill="none" stroke="#FB923C" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Activity feed */}
              <div className="float-slower absolute right-0 top-24 w-[300px] p-4 rounded-2xl bg-white text-ink-900 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Activity</div>
                  <div className="text-2xs text-ink-400">just now</div>
                </div>
                <div className="space-y-2.5">
                  {feed.map((item) => (
                    <div key={item.id} className="feed-in flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.icon === "app" ? "bg-brand-soft text-brand" : item.icon === "stock" ? "bg-ink-200/50 text-ink-700" : "bg-goodSoft text-good"}`}>
                        <FeedIcon type={item.icon} />
                      </div>
                      <div className="flex-1 min-w-0 text-xs truncate">{item.text}</div>
                      {item.amount && <div className="text-xs font-medium num">{item.amount}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles card */}
              <div className="float-slow absolute left-10 bottom-0 flex items-center gap-2 p-2.5 pr-4 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-xl">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-brand ring-2 ring-ink-900 flex items-center justify-center text-xs font-semibold">O</div>
                  <div className="w-8 h-8 rounded-full bg-amber-500 ring-2 ring-ink-900 flex items-center justify-center text-xs font-semibold">S</div>
                </div>
                <div className="text-xs leading-tight">
                  <div className="font-medium">Owner &amp; Sales roles</div>
                  <div className="text-white/50">Each sees only what they need</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-semibold tracking-tight3 leading-[1.1] max-w-md">
                Run your whole store from <span className="text-brand">one screen.</span>
              </h2>
              <p className="mt-3 text-md text-white/60 max-w-md">
                POS, app orders, deliveries and stock — synced in real time for your counter, riders and office.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
