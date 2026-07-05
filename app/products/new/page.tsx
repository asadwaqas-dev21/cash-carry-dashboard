import { addProduct } from '../actions';
import Link from 'next/link';
import CategorySelect from '@/components/CategorySelect';

export const revalidate = 0;

export default async function NewProductPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <section className="px-6 py-5 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/products" className="w-8 h-8 rounded-full hover:bg-ink-200/50 flex items-center justify-center text-ink-500 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Add New Product</h1>
          <div className="text-sm text-ink-500 mt-1">Create a new item in the catalog</div>
        </div>
      </div>

      <div className="max-w-2xl bg-panel border border-border rounded-lg p-6">
        {params?.error && (
          <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-600/20 rounded-md">
            {params.error === 'duplicate-sku' 
              ? 'A product with this SKU already exists in your organization.' 
              : 'An error occurred while saving the product.'}
          </div>
        )}
        <form action={addProduct} className="flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-700" htmlFor="name">Product Name *</label>
            <input required type="text" id="name" name="name" placeholder="e.g. Basmati Rice 40kg" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="sku">SKU *</label>
              <input required type="text" id="sku" name="sku" placeholder="e.g. SKU-1024" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="barcode">Barcode</label>
              <input type="text" id="barcode" name="barcode" placeholder="Optional" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-700" htmlFor="category_id">Category</label>
            <CategorySelect />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="cost_price">Cost Price (Rs) *</label>
              <input required type="number" step="0.01" id="cost_price" name="cost_price" placeholder="0.00" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="retail_price">Retail Price (Rs) *</label>
              <input required type="number" step="0.01" id="retail_price" name="retail_price" placeholder="0.00" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="wholesale_price">Wholesale Price (Rs)</label>
              <input type="number" step="0.01" defaultValue="0" id="wholesale_price" name="wholesale_price" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="initial_stock">Initial Stock</label>
              <input type="number" defaultValue="0" id="initial_stock" name="initial_stock" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="reorder_level">Low Stock Alert Level</label>
              <input type="number" defaultValue="10" id="reorder_level" name="reorder_level" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="reorder_quantity">Reorder Quantity</label>
              <input type="number" defaultValue="10" id="reorder_quantity" name="reorder_quantity" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-borderMuted">
            <Link href="/products" className="h-10 px-4 rounded-md border border-border bg-white text-sm font-medium hover:bg-ink-200/40 transition flex items-center justify-center">
              Cancel
            </Link>
            <button type="submit" className="h-10 px-4 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              Save Product
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
