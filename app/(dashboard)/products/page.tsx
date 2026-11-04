import { requirePageAccess } from '@/lib/auth';
import { formatMoney, formatNumber, labelize } from '@/lib/format';
import { PlusIcon, SearchBox, searchPattern, triggerPrimary } from '@/components/admin/fields';
import Link from 'next/link';

export const revalidate = 0;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const { user, supabase } = await requirePageAccess('/products');
  const isOwner = user.role === 'owner';

  let query = supabase
    .from('products')
    .select('*, categories(name), inventory_balances(quantity_on_hand, reorder_level)')
    .order('name');
  if (q.trim()) {
    const pattern = searchPattern(q);
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern},barcode.ilike.${pattern}`);
  }
  const { data: products } = await query;
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
          <SearchBox placeholder="Search by name, SKU or barcode" defaultValue={q} />
          {isOwner && (
            <Link href="/products/new" className={triggerPrimary}>
              <PlusIcon />
              Add Product
            </Link>
          )}
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
                {isOwner && <th className="text-right font-medium px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {productsList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-500">
                    {q ? `No products match “${q}”.` : 'No products yet.'}
                    {!q && isOwner && ' Use “Add Product” to create the first one.'}
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
                  <tr key={item.id} className="hover:bg-canvas transition">
                    <td className="px-5 py-3 font-medium">
                      {item.name}
                      {item.status !== 'active' && (
                        <span className="ml-2 terminal-badge bg-ink-100 text-ink-500">{labelize(item.status)}</span>
                      )}
                    </td>
                    <td className="py-3 text-ink-500">{item.categories?.name || 'Uncategorized'}</td>
                    <td className="py-3 text-ink-400 num tabular text-xs">
                      {item.sku}
                      {item.barcode && <div className="text-2xs">{item.barcode}</div>}
                    </td>
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
                    {isOwner && (
                      <td className="px-5 py-3 text-right">
                        <Link href={`/products/edit/${item.id}`} className="text-brand hover:underline font-medium text-xs">
                          Edit
                        </Link>
                      </td>
                    )}
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
