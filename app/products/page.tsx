import { supabase } from '@/lib/supabase';
import { formatMoney, formatNumber } from '@/lib/format';
import Link from 'next/link';

export const revalidate = 0;

export default async function ProductsPage() {
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      categories (
        name
      ),
      inventory_balances (
        quantity_on_hand,
        reorder_level
      )
    `)
    .order('name');

  const productsList = products || [];
  return (
    <section className="px-6 py-5 flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Products Catalog</h1>
          <div className="text-sm text-ink-500 mt-1">Manage items, pricing, and barcodes</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-2 text-ink-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search by name, SKU or barcode" className="pl-8 pr-3 h-8 w-64 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
          </div>
          <button className="h-8 px-3 rounded-md border border-border bg-white text-sm font-medium hover:bg-ink-200/40 transition flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Export
          </button>
          <Link href="/products/new" className="h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Product
          </Link>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Product Name</th>
                <th className="text-left font-medium py-3">Category</th>
                <th className="text-left font-medium py-3">SKU / Barcode</th>
                <th className="text-right font-medium py-3">Cost Price</th>
                <th className="text-right font-medium py-3">Selling Price</th>
                <th className="text-right font-medium px-5 py-3">Stock</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {productsList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-500">
                    No products found. Please add products to your Supabase database.
                  </td>
                </tr>
              )}
              {productsList.map((item: any) => {
                const stock = (item.inventory_balances || []).reduce(
                  (sum: number, row: any) => sum + Number(row.quantity_on_hand || 0),
                  0
                );
                const reorderLevel = Number(
                  item.reorder_level ||
                    item.inventory_balances?.find((row: any) => Number(row.reorder_level || 0) > 0)?.reorder_level ||
                    0
                );
                const status = stock <= 0 ? 'bad' : reorderLevel > 0 && stock <= reorderLevel ? 'warn' : 'good';
                return (
                  <tr key={item.id} className="hover:bg-canvas transition cursor-pointer">
                    <td className="px-5 py-3 font-medium">{item.name}</td>
                    <td className="py-3 text-ink-500">{item.categories?.name || 'Uncategorized'}</td>
                    <td className="py-3 text-ink-400 num tabular text-xs">{item.sku || item.barcode || '-'}</td>
                    <td className="py-3 text-right num tabular text-ink-500">{formatMoney(item.cost_price)}</td>
                    <td className="py-3 text-right num tabular font-medium">{formatMoney(item.retail_price)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`num tabular font-medium px-2 py-0.5 rounded ${
                        status === 'bad' ? 'bg-badSoft text-bad' :
                        status === 'warn' ? 'bg-warnSoft text-warn' :
                        'text-ink-700'
                      }`}>
                        {formatNumber(stock)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/products/edit/${item.id}`} className="text-brand hover:underline font-medium text-xs">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
