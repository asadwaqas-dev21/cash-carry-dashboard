export default function RightSidebar() {
  return (
    <aside className="w-80 bg-panel border-l border-border flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-borderMuted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="pulse-dot text-brand"><span className="block w-1.5 h-1.5 rounded-full bg-brand"></span></span>
          <h2 className="text-sm font-semibold">Live floor</h2>
        </div>
        <button className="text-2xs text-ink-400 hover:text-ink-900 transition">Pause</button>
      </div>

      <div className="px-5 py-4 border-b border-borderMuted grid grid-cols-3 gap-2">
        <div>
          <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Rate</div>
          <div className="text-sm font-medium num tabular text-ink-900">17/min</div>
        </div>
        <div>
          <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Active</div>
          <div className="text-sm font-medium num tabular text-ink-900">36</div>
        </div>
        <div>
          <div className="text-2xs text-ink-400 uppercase tracking-wider mb-1">Queue</div>
          <div className="text-sm font-medium num tabular text-ink-900">0</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Feed item 1 */}
        <div className="feed-item flex items-start gap-3 p-2 rounded hover:bg-canvas transition">
          <div className="mt-0.5 text-brand shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-700 truncate">App order #4831</div>
            <div className="text-xs text-ink-500 mt-0.5">Customer app</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-ink-400 num tabular">just now</div>
            <div className="text-xs text-brand font-medium num tabular mt-0.5">Rs 109.00</div>
          </div>
        </div>

        {/* Feed item 2 */}
        <div className="feed-item flex items-start gap-3 p-2 rounded hover:bg-canvas transition" style={{ animationDelay: '50ms' }}>
          <div className="mt-0.5 text-good shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-700 truncate">Rider R-1019 delivered</div>
            <div className="text-xs text-ink-500 mt-0.5">Delivery</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-ink-400 num tabular">just now</div>
            <div className="text-xs text-good font-medium num tabular mt-0.5">#4839</div>
          </div>
        </div>

        {/* Feed item 3 */}
        <div className="feed-item flex items-start gap-3 p-2 rounded hover:bg-canvas transition" style={{ animationDelay: '100ms' }}>
          <div className="mt-0.5 text-brand shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-700 truncate">App order #4833</div>
            <div className="text-xs text-ink-500 mt-0.5">Customer app</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-ink-400 num tabular">just now</div>
            <div className="text-xs text-brand font-medium num tabular mt-0.5">Rs 292.00</div>
          </div>
        </div>

        {/* Feed item 4 */}
        <div className="feed-item flex items-start gap-3 p-2 rounded hover:bg-canvas transition" style={{ animationDelay: '150ms' }}>
          <div className="mt-0.5 text-warn shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-700 truncate">Stock decreased</div>
            <div className="text-xs text-ink-500 mt-0.5">SKU-8842</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-ink-400 num tabular">just now</div>
            <div className="text-xs text-warn font-medium num tabular mt-0.5">11 units</div>
          </div>
        </div>

        {/* Feed item 5 */}
        <div className="feed-item flex items-start gap-3 p-2 rounded hover:bg-canvas transition" style={{ animationDelay: '200ms' }}>
          <div className="mt-0.5 text-warn shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-700 truncate">Stock decreased</div>
            <div className="text-xs text-ink-500 mt-0.5">SKU-8842</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-ink-400 num tabular">just now</div>
            <div className="text-xs text-warn font-medium num tabular mt-0.5">10 units</div>
          </div>
        </div>

        {/* Feed item 6 */}
        <div className="feed-item flex items-start gap-3 p-2 rounded hover:bg-canvas transition" style={{ animationDelay: '250ms' }}>
          <div className="mt-0.5 text-ink-500 shrink-0 bg-ink-200/50 rounded flex items-center justify-center w-5 h-5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-700 truncate">POS synced with server</div>
            <div className="text-xs text-ink-500 mt-0.5">System</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-ink-400 num tabular">just now</div>
            <div className="text-xs text-ink-500 font-medium num tabular mt-0.5">2.1MB</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-borderMuted">
        <button className="w-full py-2 bg-white border border-border hover:border-ink-400 text-sm text-ink-700 font-medium rounded-md transition shadow-sm">
          View full audit log
        </button>
      </div>
    </aside>
  );
}
