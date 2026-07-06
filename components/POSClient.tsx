'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { createPOSOrder } from '@/app/pos/actions';

type Product = {
  id: string;
  name: string;
  retail_price: number;
  categories?: { name: string };
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function POSClient({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  const categoryCounts = products.reduce((acc, p) => {
    const cat = p.categories?.name || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.categories?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (p.categories?.name || 'Uncategorized') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.product.retail_price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const orderData = {
        cart: cart.map(c => ({
          id: c.product.id,
          name: c.product.name,
          price: c.product.retail_price,
          quantity: c.quantity
        })),
        total,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' && cashReceived ? Number(cashReceived) : undefined,
        cashChange: paymentMethod === 'cash' && cashReceived ? Math.max(0, Number(cashReceived) - total) : undefined,
      };

      const res = await createPOSOrder(orderData);

      if (res.success) {
        setCompletedOrder({
          orderNumber: res.orderNumber,
          items: orderData.cart,
          total: orderData.total,
          paymentMethod: orderData.paymentMethod,
          cashReceived: orderData.cashReceived,
          cashChange: orderData.cashChange,
          date: new Date().toLocaleString()
        });
        setCart([]);
        setIsCheckingOut(false);
        setCashReceived('');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintQuote = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    setCompletedOrder({
      orderNumber: 'QUOTE-' + Math.floor(1000 + Math.random() * 9000),
      items: cart.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        price: c.product.retail_price,
        quantity: c.quantity,
      })),
      total: total,
      paymentMethod: 'quote',
      date: new Date().toLocaleString(),
    });

    setTimeout(() => {
      window.print();
      setCompletedOrder(null);
    }, 300);
  };

  return (
    <>
      <div className="flex h-full w-full bg-[#F5F3EE] print:hidden">

        {/* Left: Product Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">

          {/* Header with Search */}
          <div className="px-6 pt-5 pb-3 bg-white border-b border-border z-10 flex flex-col gap-4 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-center border border-border rounded-lg bg-white h-12 px-4 shadow-sm relative focus-within:border-ink-900 transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-400 shrink-0"><path d="M4 4h4v16H4zM16 4h4v16h-4zM10 4h1v16h-1zM13 4h1v16h-1z" /></svg>
                <input
                  type="text"
                  placeholder="Scan barcode or search SKU/name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 h-full bg-transparent px-3 text-[15px] placeholder:text-ink-400 focus:outline-none"
                />
                <div className="flex items-center gap-2.5 shrink-0 border-l border-border pl-4">
                  <kbd className="px-2 py-0.5 bg-canvas border border-border rounded text-2xs font-medium text-ink-600 shadow-sm leading-tight">Enter</kbd>
                  <span className="text-xs text-ink-500 font-medium">add to bill</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 mt-1 scrollbar-hide -mx-6 px-6">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`flex items-center gap-2 h-[34px] px-4 rounded-full border whitespace-nowrap transition-colors ${selectedCategory === 'All'
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-700 border-border hover:border-ink-400 shadow-sm'
                  }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
                <span className="font-semibold text-xs tracking-wide">All</span>
                <span className={`text-2xs tabular num font-medium ${selectedCategory === 'All' ? 'text-white/60' : 'text-ink-400'}`}>{products.length.toLocaleString()}</span>
              </button>
              {Object.entries(categoryCounts).sort().map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 h-[34px] px-4 rounded-full border whitespace-nowrap transition-colors ${selectedCategory === cat
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-white text-ink-700 border-border hover:border-ink-400 shadow-sm'
                    }`}
                >
                  <span className="font-semibold text-xs tracking-wide">{cat}</span>
                  <span className={`text-2xs tabular num font-medium ${selectedCategory === cat ? 'text-white/60' : 'text-ink-400'}`}>{count.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-border rounded-xl p-8 text-center text-ink-500 shadow-sm">
                {searchQuery ? 'No products found matching your search.' : 'No active products found in Supabase.'}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white border border-border rounded-2xl p-3 flex flex-col text-left hover:border-ink-400 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all group overflow-hidden active:scale-95"
                  >
                    <div className="w-full aspect-square bg-canvas rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                      <svg className="text-ink-200" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    </div>
                    <div className="text-[10px] text-ink-400 mb-1 tracking-wider uppercase font-medium">SKU-{product.id.substring(0, 4)}</div>
                    <div className="text-[13px] font-semibold text-ink-900 leading-tight mb-0.5 line-clamp-1">{product.name}</div>
                    <div className="text-[11px] text-ink-500 line-clamp-1 mb-3">{product.categories?.name || 'Uncategorized'} · Premium</div>

                    <div className="mt-auto flex flex-col w-full pt-1">
                      <div className="text-[11px] font-bold text-ink-900 mb-0.5">Rs</div>
                      <div className="flex items-center justify-between w-full gap-1">
                        <div className="text-[14px] font-bold num tabular text-ink-900 tracking-tight truncate">
                          {product.retail_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {/* Mock stock indicator logic */}
                        {product.id.charCodeAt(0) % 3 === 0 ? (
                          <div className="text-[9px] font-bold text-[#EA580C] uppercase tracking-wider shrink-0">left</div>
                        ) : product.id.charCodeAt(0) % 5 === 0 ? (
                          <div className="text-[9px] font-bold text-[#DC2626] uppercase tracking-wider shrink-0">Out</div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right: Shopping Cart */}
        <div className="w-[380px] shrink-0 bg-white border-l border-border flex flex-col z-30 shadow-[-8px_0_24px_rgba(0,0,0,0.02)] relative">


          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1 mt-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-ink-400 space-y-4 opacity-70">
                <div className="w-16 h-16 rounded-full bg-canvas flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                </div>
                <p className="text-sm font-medium">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex gap-3 py-2.5 border-b border-borderMuted last:border-0 group">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-semibold text-[13px] text-ink-900 mb-0.5 leading-snug line-clamp-1">{item.product.name}</div>
                    <div className="text-ink-400 text-[11px] mb-1">SKU-{item.product.id.substring(0, 4)}</div>
                    <div className="text-ink-900 font-bold text-[13px] num tabular tracking-tight">{formatMoney(item.product.retail_price)}</div>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button onClick={() => removeFromCart(item.product.id)} className="text-ink-300 hover:text-bad p-1 -mr-1 opacity-0 group-hover:opacity-100 transition">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded-full bg-canvas text-ink-500 hover:text-ink-900 hover:bg-ink-200 flex items-center justify-center transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                      <span className="text-[13px] font-bold num tabular w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded-full bg-canvas text-ink-500 hover:text-ink-900 hover:bg-ink-200 flex items-center justify-center transition">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals Block */}
          <div className="px-5 pt-4 pb-0 border-t border-border relative">
            <div className="absolute top-0 left-5 right-5 h-px bg-white/50 -translate-y-[2px]"></div>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between items-center text-xs text-ink-500 font-medium">
                <span>Subtotal · {cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                <span className="num tabular font-bold text-ink-900 tracking-tight">{formatMoney(total).replace('Rs ', '')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <button className="text-[#EA580C] hover:underline font-semibold">Add discount</button>
                <span className="num tabular font-bold text-ink-900 tracking-tight">0.00</span>
              </div>
              <div className="flex justify-between items-center text-xs text-ink-500 font-medium">
                <span>VAT 5%</span>
                <span className="num tabular font-bold text-ink-900 tracking-tight">{(total * 0.05).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-end mb-5">
              <div className="text-[10px] text-ink-500 font-bold uppercase tracking-wider mb-2">Rs · incl. VAT</div>
              <div className="text-[48px] leading-[0.8] font-bold tabular num tracking-tight3 text-ink-900">
                {formatMoney(total * 1.05).replace('Rs ', '')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 pt-0 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={cart.length === 0}
                onClick={() => { setPaymentMethod('cash'); setIsCheckingOut(true); }}
                className="h-[56px] bg-ink-900 hover:bg-ink-800 text-white rounded-[14px] flex flex-col items-center justify-center relative transition disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-2 text-[15px] font-semibold mb-0.5 group-active:scale-95 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 12h.01" /></svg>
                  Pay Cash
                </div>

              </button>
              <button
                disabled={cart.length === 0}
                onClick={() => { setPaymentMethod('card'); setIsCheckingOut(true); }}
                className="h-[56px] bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-[14px] flex flex-col items-center justify-center relative transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(234,88,12,0.25)] group"
              >
                <div className="flex items-center gap-2 text-[15px] font-semibold mb-0.5 group-active:scale-95 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                  Pay Card
                </div>

              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-1">
              <button className="h-12 bg-white border border-border rounded-xl text-xs font-semibold text-ink-700 flex items-center justify-center gap-1.5 hover:bg-canvas transition shadow-sm active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /></svg>
                Hold
              </button>
              <button
                onClick={handlePrintQuote}
                disabled={cart.length === 0}
                className="h-12 bg-white border border-border rounded-xl text-xs font-semibold text-ink-700 flex items-center justify-center gap-1.5 hover:bg-canvas transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                Print quote
              </button>
              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="h-12 bg-white border border-border rounded-xl text-xs font-semibold text-[#DC2626] flex items-center justify-center gap-1.5 hover:bg-badSoft transition shadow-sm disabled:opacity-50 active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal Overlay */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-panel/50">
              <h3 className="text-lg font-semibold">Complete Payment</h3>
              <button onClick={() => setIsCheckingOut(false)} className="text-ink-400 hover:text-ink-900 p-1 rounded-md hover:bg-ink-200/50 transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-8">
                <div className="text-sm text-ink-500 font-medium mb-1">Amount Due (incl. VAT)</div>
                <div className="text-4xl font-bold text-brand tabular num tracking-tight2">{formatMoney(total * 1.05)}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-ink-700 block mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`h-12 border rounded-lg font-semibold text-[15px] transition ${paymentMethod === 'cash' ? 'border-brand bg-brand/5 text-brand shadow-sm' : 'border-border text-ink-600 hover:bg-canvas'}`}
                    >
                      Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`h-12 border rounded-lg font-semibold text-[15px] transition ${paymentMethod === 'card' ? 'border-[#EA580C] bg-[#EA580C]/5 text-[#EA580C] shadow-sm' : 'border-border text-ink-600 hover:bg-canvas'}`}
                    >
                      Card
                    </button>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-ink-700 block mb-2" htmlFor="cash">Cash Received (Rs)</label>
                    <input
                      type="number"
                      id="cash"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={(total * 1.05).toFixed(2).toString()}
                      className="w-full h-12 px-4 rounded-lg border border-border bg-canvas text-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num"
                    />
                    {Number(cashReceived) >= (total * 1.05) && (
                      <div className="mt-3 flex justify-between items-center p-3 bg-goodSoft border border-good/20 rounded-lg text-good">
                        <span className="text-sm font-medium">Change to return:</span>
                        <span className="font-bold text-lg num tabular">Rs {(Number(cashReceived) - (total * 1.05)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-panel border-t border-border flex gap-3">
              <button
                onClick={() => setIsCheckingOut(false)}
                className="flex-1 h-12 border border-border bg-white text-ink-700 rounded-lg font-semibold text-[15px] hover:bg-ink-200/40 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={isSubmitting || (paymentMethod === 'cash' && (cashReceived === '' || Number(cashReceived) < (total * 1.05)))}
                className={`flex-[2] h-12 text-white rounded-lg font-semibold text-[15px] transition disabled:opacity-50 flex items-center justify-center shadow-sm ${paymentMethod === 'cash' ? 'bg-ink-900 hover:bg-ink-800' : 'bg-[#EA580C] hover:bg-[#C2410C]'}`}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal Overlay (Visible when printing) */}
      {completedOrder && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 print:bg-white print:p-0 print:flex print:items-start print:justify-center ${completedOrder.paymentMethod === 'quote' ? 'opacity-0 pointer-events-none print:opacity-100' : 'bg-ink-900/60 backdrop-blur-sm'}`}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-[400px] flex flex-col overflow-hidden print:shadow-none print:max-w-[320px] print:w-full print:mx-auto">
            <div className="p-8 pb-4 print:p-4 text-ink-900" id="receipt-content">
              <div className="text-center mb-6">

                <div className="text-sm text-ink-500">Receipt: {completedOrder.orderNumber}</div>
                <div className="text-sm text-ink-500">{completedOrder.date}</div>
              </div>

              <div className="border-t border-b border-dashed border-border py-4 mb-4">
                <div className="flex justify-between text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                <div className="space-y-3">
                  {completedOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <div className="pr-4">
                        <div className="font-medium text-ink-900">{item.name}</div>
                        <div className="text-ink-500 text-xs">{item.quantity} x Rs {item.price.toFixed(2)}</div>
                      </div>
                      <div className="font-medium text-ink-900 tabular num shrink-0">
                        Rs {(item.quantity * item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 mb-6 text-sm">
                <div className="flex justify-between text-ink-600">
                  <span>Subtotal</span>
                  <span className="tabular num text-ink-900">Rs {completedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1 text-ink-500">
                  <span>VAT (5%)</span>
                  <span className="tabular num text-ink-900">Rs {(completedOrder.total * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-3 pt-3 border-t border-ink-200 text-ink-900">
                  <span>Total</span>
                  <span className="tabular num">Rs {(completedOrder.total * 1.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-600 mt-2">
                  <span>Payment Method</span>
                  <span className="capitalize text-ink-900">{completedOrder.paymentMethod}</span>
                </div>
                {completedOrder.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-ink-600">
                      <span>Cash Tendered</span>
                      <span className="tabular num text-ink-900">Rs {Number(completedOrder.cashReceived).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Change</span>
                      <span className="tabular num text-ink-900">Rs {Number(completedOrder.cashChange).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-sm font-medium text-ink-500 pb-2">
                Thank you for your purchase!
              </div>
            </div>

            <div className="p-4 bg-canvas border-t border-border flex gap-3 print:hidden">
              <button
                onClick={() => setCompletedOrder(null)}
                className="flex-1 h-11 border border-border bg-white text-ink-700 rounded-lg font-semibold text-[15px] hover:bg-ink-200/40 transition"
              >
                New Order
              </button>
              <button
                onClick={() => window.print()}
                className="flex-[2] h-11 bg-brand text-white rounded-lg font-semibold text-[15px] hover:bg-brand-hover transition flex items-center justify-center gap-2 shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
