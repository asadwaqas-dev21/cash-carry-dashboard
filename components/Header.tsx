export default function Header() {
  return (
    <header className="h-12 border-b border-border bg-canvas flex items-center px-5 gap-4 shrink-0">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <span id="crumb-section">Overview</span>
      </div>

      <div className="flex-1 max-w-md ml-6">
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search orders, products, customers…" className="w-full h-8 pl-8 pr-16 bg-white border border-border rounded-md text-sm placeholder:text-ink-400 focus:outline-none focus:border-ink-500 transition" />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-ink-400 font-mono border border-border rounded px-1.5 py-0.5 bg-canvas">⌘K</kbd>
        </div>
      </div>

      {/* Sync status pill */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-goodSoft border border-good/20">
        <span className="pulse-dot text-good"><span className="block w-1.5 h-1.5 rounded-full bg-good"></span></span>
        <span className="text-xs text-good font-medium">All systems synced</span>
      </div>

      {/* Icons */}
      <button className="w-8 h-8 rounded-md hover:bg-ink-200/40 flex items-center justify-center text-ink-500 hover:text-ink-900 transition relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand"></span>
      </button>
      <button className="w-8 h-8 rounded-md hover:bg-ink-200/40 flex items-center justify-center text-ink-500 hover:text-ink-900 transition">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </header>
  );
}
