"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-canvas border-r border-border flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-borderMuted">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-ink-900 rounded-md flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h20l-2 6H4z" /><path d="M4 9v11h16V9" /><line x1="12" y1="12" x2="12" y2="16" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight2 leading-none">Kirana</div>
            <div className="text-2xs text-ink-400 mt-0.5">Cash &amp; Carry</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <div className="text-2xs text-ink-400 uppercase tracking-wider px-3 py-1.5">Operate</div>
        <Link href="/" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname === '/' ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
          Overview
        </Link>
        <Link href="/orders" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/orders') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
          Orders
          <span className="ml-auto text-2xs num text-ink-400">247</span>
        </Link>
        <Link href="/pos" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/pos') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><circle cx="7" cy="15" r="1" /></svg>
          Point of Sale
          <span className="ml-auto flex items-center gap-1">
            <span className="pulse-dot text-good"><span className="block w-1.5 h-1.5 rounded-full bg-good"></span></span>
          </span>
        </Link>
        <Link href="/deliveries" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/deliveries') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18h-5" /><path d="M17 18h4" /><path d="M17 8h4l1 4v6h-5" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
          Deliveries
          <span className="ml-auto text-2xs num text-ink-400">18</span>
        </Link>

        <div className="text-2xs text-ink-400 uppercase tracking-wider px-3 py-1.5 mt-3">Catalog</div>
        <Link href="/products" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/products') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z" /><line x1="3" y1="6" x2="21" y2="6" /></svg>
          Products
        </Link>
        <Link href="/inventory" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/inventory') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22V12" /><path d="m3.29 7 8 4.4a2 2 0 0 0 1.96 0l8-4.4" /><path d="M21 16.5V7.5a2 2 0 0 0-1-1.7l-7-4.09a2 2 0 0 0-2 0L4 5.8a2 2 0 0 0-1 1.7v9a2 2 0 0 0 1 1.7l7 4.09a2 2 0 0 0 2 0l7-4.09a2 2 0 0 0 1-1.7" /></svg>
          Inventory
          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-warnSoft text-warn text-2xs num font-medium">3</span>
        </Link>
        <Link href="/categories" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/categories') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          Categories
        </Link>

        <div className="text-2xs text-ink-400 uppercase tracking-wider px-3 py-1.5 mt-3">People</div>
        <Link href="/customers" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/customers') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          Customers
        </Link>
        <Link href="/riders" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/riders') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></svg>
          Riders
        </Link>
        <Link href="/staff" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/staff') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
          Staff
        </Link>

        <div className="text-2xs text-ink-400 uppercase tracking-wider px-3 py-1.5 mt-3">Money</div>
        <Link href="/payments" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/payments') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
          Payments
        </Link>
        <Link href="/cash" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/cash') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          Cash Reconciliation
        </Link>
        <Link href="/analytics" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/analytics') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          Analytics
        </Link>

        <div className="text-2xs text-ink-400 uppercase tracking-wider px-3 py-1.5 mt-3">System</div>
        <Link href="/settings" className={`nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm mb-0.5 ${pathname.startsWith('/settings') ? 'active' : ''}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          Settings
        </Link>
      </nav>

      {/* User */}
      <div className="border-t border-borderMuted p-2">
        <div className="flex items-center gap-2.5 p-1.5 rounded-md">
          <div className="w-7 h-7 rounded-full bg-ink-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">SA</div>
          <div className="text-left min-w-0 flex-1">
            <div className="text-xs font-medium truncate">Asad Waqas</div>
            <div className="text-2xs text-ink-400">Owner</div>
          </div>
          <button
            onClick={async () => {
              const { supabaseBrowser } = await import('@/lib/supabase-browser');
              await supabaseBrowser.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-7 h-7 rounded flex items-center justify-center text-ink-400 hover:text-bad hover:bg-badSoft transition shrink-0"
            title="Sign out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
