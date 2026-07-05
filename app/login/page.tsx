"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'owner' | 'sales_person'>('owner');

  useEffect(() => {
    if (role === 'owner') setEmail('asad@gmail.com');
    else setEmail('sales@cashcarry.ae');
  }, [role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Using Supabase Auth
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      let errMsg = error?.message;
      if (!errMsg || errMsg === '{}') {
        errMsg = "Invalid login credentials or network error.";
      }
      setError(errMsg);
      setLoading(false);
    } else {
      // Successful login
      window.location.href = "/";
    }
  };

  // --- Ticker Logic ---
  const activityFeed = [
    { id: 1, icon: 'pos', text: <>POS sale · <span className="num">R-4831</span></>, time: '14:24', amount: 'Rs 1,262' },
    { id: 2, icon: 'app', text: <>App order · <span className="num">#4832</span></>, time: '14:23', amount: 'Rs 348' },
    { id: 3, icon: 'inventory', text: 'Stock count completed', time: '14:15', amount: '' },
    { id: 4, icon: 'rider', text: 'Rider #12 arrived at warehouse', time: '14:10', amount: '' },
    { id: 5, icon: 'pos', text: <>POS sale · <span className="num">R-4830</span></>, time: '14:18', amount: 'Rs 6,120' },
    { id: 6, icon: 'app', text: <>App order · <span className="num">#4831</span></>, time: '14:16', amount: 'Rs 2,847' },
  ];

  const [activeTicker, setActiveTicker] = useState(activityFeed.slice(0, 4));

  useEffect(() => {
    let index = 4;
    const interval = setInterval(() => {
      const nextEvtSource = activityFeed[index % activityFeed.length];
      const nextEvt = { ...nextEvtSource, id: Date.now(), time: 'just now' };
      index++;
      setActiveTicker((prev) => {
        const newArr = [nextEvt, ...prev];
        if (newArr.length > 4) newArr.pop();
        return newArr;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getIconSvg = (type: string) => {
    const size = 11;
    switch (type) {
      case 'pos': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
      case 'app': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /></svg>;
      case 'rider': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></svg>;
      case 'sync': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><polyline points="21 3 21 9 15 9" /></svg>;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'pos': return 'bg-goodSoft text-good';
      case 'app': return 'bg-brand/10 text-brand';
      case 'rider': return 'bg-goodSoft text-good';
      case 'sync': return 'bg-ink-200/60 text-ink-500';
    }
  };

  return (
    <>
      <style>{`
        .grid-paper {
          background-image:
            linear-gradient(to right, rgba(120, 113, 108, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(120, 113, 108, 0.08) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .form-input {
          transition: all 0.15s ease;
        }
        .form-input:focus-within {
          border-color: #0C0A09;
          box-shadow: 0 0 0 3px rgba(12, 10, 9, 0.06);
        }
        .form-input.error:focus-within {
          border-color: #B91C1C;
          box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.06);
        }
        .btn {
          transition: all 0.12s ease;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .ticker-item {
          animation: tickerIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes tickerIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .right-panel { display: none !important; }
          .left-panel { width: 100% !important; max-width: none !important; }
        }
      `}</style>

      <div className="min-h-screen flex bg-canvas">
        {/* ========== LEFT: FORM PANEL ========== */}
        <div className="left-panel w-[560px] bg-white flex flex-col shrink-0 relative">

          {/* Top: Brand mark + version pill */}
          <div className="flex items-center justify-between p-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-ink-900 rounded-md flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h20l-2 6H4z" /><path d="M4 9v11h16V9" /><line x1="12" y1="12" x2="12" y2="16" />
                </svg>
              </div>
              <div className="leading-none">
                <div className="text-sm font-semibold tracking-tight2">Cash & Carry</div>
                <div className="text-2xs text-ink-400 mt-0.5">Operations</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas border border-border">
              <span className="text-2xs text-ink-400 num tabular">v2.4.1</span>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center px-8 pb-8">
            <div className="w-full max-w-sm mx-auto">

              <div className="mb-8">
                <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Operations dashboard</div>
                <h1 className="text-3xl font-semibold tracking-tight3 leading-tight">Sign in to continue</h1>
                <div className="text-sm text-ink-500 mt-2">Access orders, inventory, and reports for your warehouse.</div>
              </div>

              {error && (
                <div className="mb-6 p-3 text-sm text-bad bg-badSoft border border-bad/20 rounded-md">
                  {error}
                </div>
              )}

              <button className="w-full mb-6 p-3 rounded-lg border border-border bg-canvas hover:border-ink-400 transition flex items-center gap-3 text-left group">
                <div className="w-9 h-9 rounded-md bg-white border border-border flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-700">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xs text-ink-400 uppercase tracking-wider mb-0.5">Signing in to</div>
                  <div className="text-sm font-medium truncate">Deira Warehouse · Dubai</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-400 shrink-0 group-hover:text-ink-700 transition"><polyline points="6 9 12 15 18 9" /></svg>
              </button>

              <form onSubmit={handleLogin} className="space-y-4">

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1.5">Select Role</label>
                  <div className="flex p-1 bg-canvas border border-border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${role === 'owner' ? 'bg-white text-ink-900 shadow-sm border border-border/50' : 'text-ink-500 hover:text-ink-700'}`}
                    >
                      Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('sales_person')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${role === 'sales_person' ? 'bg-white text-ink-900 shadow-sm border border-border/50' : 'text-ink-500 hover:text-ink-700'}`}
                    >
                      Sales Person
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-ink-700 mb-1.5">Work email</label>
                  <div className={`form-input flex items-center gap-2.5 h-11 px-3 bg-white border-2 border-border rounded-lg ${error ? 'error' : ''}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-400 shrink-0">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="flex-1 h-full bg-transparent text-sm placeholder:text-ink-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-medium text-ink-700">Password</label>
                    <a href="#" className="text-xs text-brand hover:text-brand-hover font-medium transition">Forgot?</a>
                  </div>
                  <div className={`form-input flex items-center gap-2.5 h-11 px-3 bg-white border-2 border-border rounded-lg ${error ? 'error' : ''}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-400 shrink-0">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="flex-1 h-full bg-transparent text-sm placeholder:text-ink-400 focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="w-7 h-7 rounded hover:bg-canvas flex items-center justify-center text-ink-400 hover:text-ink-700 transition shrink-0">
                      {showPassword ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer group py-1">
                  <div className="relative w-4 h-4">
                    <input type="checkbox" defaultChecked className="peer sr-only" />
                    <div className="w-4 h-4 rounded border-2 border-border peer-checked:border-ink-900 peer-checked:bg-ink-900 transition-all"></div>
                    <svg className="hidden peer-checked:block absolute inset-0 text-white pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>
                  </div>
                  <span className="text-xs text-ink-700 group-hover:text-ink-900 transition">Keep me signed in on this device</span>
                </label>

                <button type="submit" disabled={loading} className="btn w-full h-11 rounded-lg bg-ink-900 text-white text-sm font-semibold hover:bg-ink-700 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-2xs text-ink-400 uppercase tracking-wider">Or continue with</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <div className="space-y-2">
                <button className="btn w-full h-11 rounded-lg bg-white border border-border text-sm font-medium hover:border-ink-400 hover:bg-canvas flex items-center justify-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google Workspace</span>
                </button>

                <button className="btn w-full h-11 rounded-lg bg-white border border-border text-sm font-medium hover:border-ink-400 hover:bg-canvas flex items-center justify-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-700">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span>Sign in with SSO</span>
                  <span className="text-2xs text-ink-400 num ml-1">SAML</span>
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-ink-500">
                  Trouble signing in? <a href="#" className="text-brand hover:text-brand-hover font-medium">Contact your admin</a>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom footer */}
          <div className="p-8 pt-4 flex items-center justify-between text-2xs text-ink-400">
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-ink-700 transition">Terms</a>
              <a href="#" className="hover:text-ink-700 transition">Privacy</a>
              <a href="#" className="hover:text-ink-700 transition">Security</a>
            </div>
            <div className="num tabular">© 2026 cash&carry Ops FZ-LLC</div>
          </div>
        </div>

        {/* ========== RIGHT: CONTEXT PANEL ========== */}
        <div className="right-panel flex-1 bg-[#F5F3EE] relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 grid-paper"></div>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: 'radial-gradient(circle, #EA580C 0%, transparent 70%)' }}></div>

          <div className="relative flex-1 flex flex-col p-12">
            <div className="mb-auto">
              <div className="flex items-center gap-2 mb-6">
                <span className="pulse-dot text-brand"><span className="block w-1.5 h-1.5 rounded-full bg-brand"></span></span>
                <span className="text-2xs text-ink-500 uppercase tracking-wider font-medium">Live · Deira Warehouse</span>
              </div>

              <h2 className="text-5xl font-bold tracking-tight4 leading-[0.95] mb-3">
                Everything running<br />on the floor,<br /><span className="text-brand">in one place.</span>
              </h2>
              <p className="text-sm text-ink-500 max-w-md leading-relaxed">
                POS transactions, app orders, deliveries, inventory, and rider cash — synced in real time so nothing slips through the cracks.
              </p>
            </div>

            <div className="my-10">
              <div className="bg-white/80 backdrop-blur-sm border border-border rounded-xl p-5 max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="pulse-dot text-good"><span className="block w-1.5 h-1.5 rounded-full bg-good"></span></span>
                    <span className="text-sm font-semibold">All systems operational</span>
                  </div>
                  <a href="#" className="text-2xs text-ink-500 hover:text-ink-900 num tabular transition">status.cashcarryops.ae →</a>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-borderMuted">
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-good shrink-0">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium leading-tight">POS register</div>
                      <div className="text-[10px] text-ink-500 mt-0.5 leading-none">Online · Ali Khan</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-good shrink-0">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" /><polyline points="21 3 21 9 15 9" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium leading-tight">Data sync</div>
                      <div className="text-[10px] text-ink-500 num tabular mt-0.5 leading-none">Live · 2s lag</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-good shrink-0">
                      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18h-5" /><path d="M17 18h4" /><path d="M17 8h4l1 4v6h-5" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium leading-tight">Rider fleet</div>
                      <div className="text-[10px] text-ink-500 num tabular mt-0.5 leading-none">18 active</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-good shrink-0">
                      <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium leading-tight">Customer app</div>
                      <div className="text-[10px] text-ink-500 num tabular mt-0.5 leading-none">247 orders today</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-borderMuted flex items-center justify-between text-2xs text-ink-400">
                  <span>Last incident</span>
                  <span className="num tabular">47 days ago</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-2xs text-ink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="pulse-dot text-brand"><span className="block w-1 h-1 rounded-full bg-brand"></span></span>
                Live activity
              </div>
              <div className="space-y-1.5 max-w-md relative overflow-hidden" style={{ height: '120px' }}>
                {activeTicker.map((evt) => (
                  <div key={evt.id} className="ticker-item flex items-center gap-2.5 text-xs py-1 transition-all duration-300">
                    <div className={`w-5 h-5 rounded ${getIconBg(evt.icon)} flex items-center justify-center shrink-0`}>
                      {getIconSvg(evt.icon)}
                    </div>
                    <div className="flex-1 min-w-0 truncate text-ink-700">{evt.text}</div>
                    <div className="text-2xs text-ink-400 num tabular shrink-0">{evt.time}</div>
                    {evt.amount ? (
                      <div className="text-2xs num tabular font-medium text-ink-700 shrink-0 min-w-[52px] text-right">{evt.amount}</div>
                    ) : (
                      <div className="min-w-[52px]"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-between text-2xs text-ink-400">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-ink-500">Build</span>
                  <span className="num tabular ml-1.5">2.4.1-a3f81b</span>
                </div>
                <div>
                  <span className="text-ink-500">Region</span>
                  <span className="num tabular ml-1.5">AE-DXB-1</span>
                </div>
              </div>
              <div className="num tabular">Powered by Jadeed</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
