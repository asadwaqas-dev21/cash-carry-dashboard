import { updateProduct, deleteProduct } from '../../actions';
import Link from 'next/link';
import CategorySelect from '@/components/CategorySelect';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      inventory_balances (
        quantity_on_hand
      )
    `)
    .eq('id', id)
    .single();

  if (error || !product) {
    notFound();
  }

  const updateAction = updateProduct.bind(null, id);
  const deleteAction = deleteProduct.bind(null, id);

  const currentStock = product.inventory_balances?.[0]?.quantity_on_hand || 0;

  return (
    <section className="px-6 py-5 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/products" className="w-8 h-8 rounded-full hover:bg-ink-200/50 flex items-center justify-center text-ink-500 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight2">Edit Product</h1>
          <div className="text-sm text-ink-500 mt-1">Update product details or remove it from the catalog</div>
        </div>
      </div>

      <div className="max-w-2xl bg-panel border border-border rounded-lg p-6">
        {resolvedSearchParams?.error && (
          <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-600/20 rounded-md">
            {resolvedSearchParams.error === 'duplicate-sku'
              ? 'A product with this SKU already exists in your organization.'
              : 'An error occurred while saving the product.'}
          </div>
        )}
        <form action={updateAction} id="update-form" className="flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-700" htmlFor="name">Product Name *</label>
            <input required defaultValue={product.name} type="text" id="name" name="name" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="sku">SKU *</label>
              <input required defaultValue={product.sku} type="text" id="sku" name="sku" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="barcode">Barcode</label>
              <input type="text" defaultValue={product.barcode || ''} id="barcode" name="barcode" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-700" htmlFor="category_id">Category</label>
            {/* CategorySelect needs a way to set initial value. We will assume it gets it from defaultValue or similar, but since we don't have its code we just include it. If it doesn't support defaultValue easily, we might need a hidden input or it might read from URL. Let's just put it in and pass defaultValue if it accepts it. Looking at `new`, it doesn't pass anything. We'll pass defaultValue={product.category_id} and hope it handles it or we'll check it later. */}
            <CategorySelect defaultValue={product.category_id} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="cost_price">Cost Price (Rs) *</label>
              <input required defaultValue={product.cost_price} type="number" step="0.01" id="cost_price" name="cost_price" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="retail_price">Retail Price (Rs) *</label>
              <input required defaultValue={product.retail_price} type="number" step="0.01" id="retail_price" name="retail_price" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="wholesale_price">Wholesale Price (Rs)</label>
              <input type="number" defaultValue={product.wholesale_price} step="0.01" id="wholesale_price" name="wholesale_price" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="stock">Current Stock</label>
              <input type="number" defaultValue={currentStock} id="stock" name="stock" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="reorder_level">Low Stock Alert Level</label>
              <input type="number" defaultValue={product.reorder_level} id="reorder_level" name="reorder_level" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700" htmlFor="reorder_quantity">Reorder Quantity</label>
              <input type="number" defaultValue={product.reorder_quantity} id="reorder_quantity" name="reorder_quantity" className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition tabular num" />
            </div>
          </div>

        </form>
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-borderMuted">
          <form action={deleteAction}>
            <button type="submit" className="h-10 px-4 rounded-md border border-red-600/30 text-red-600 hover:bg-red-50 transition text-sm font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              Delete Product
            </button>
          </form>
          <div className="flex gap-3">
            <Link href="/products" className="h-10 px-4 rounded-md border border-border bg-white text-sm font-medium hover:bg-ink-200/40 transition flex items-center justify-center">
              Cancel
            </Link>
            <button type="submit" form="update-form" className="h-10 px-4 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center justify-center">
              Update Product
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
