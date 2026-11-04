import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageAccess } from '@/lib/auth';
import ActionForm from '@/components/admin/ActionForm';
import ConfirmButton from '@/components/admin/ConfirmButton';
import ProductFields from '../../ProductFields';
import { deleteProduct, updateProduct } from '../../actions';

export const revalidate = 0;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requirePageAccess('/products/edit');
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*, inventory_balances(quantity_on_hand)').eq('id', id).maybeSingle(),
    supabase.from('categories').select('id, name').order('name'),
  ]);
  if (!product) notFound();

  const stock = (product.inventory_balances || []).reduce(
    (sum: number, row: any) => sum + Number(row.quantity_on_hand || 0),
    0
  );

  return (
    <section className="px-6 py-5 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/products" className="w-8 h-8 rounded-full hover:bg-ink-200/50 flex items-center justify-center text-ink-500 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Edit Product</h1>
          <div className="text-sm text-ink-500 mt-1">{product.name}</div>
        </div>
      </div>

      <div className="max-w-2xl bg-panel border border-border rounded-lg p-6">
        <ActionForm action={updateProduct} submitLabel="Save changes">
          <ProductFields categories={categories || []} product={product} stock={stock} />
        </ActionForm>
      </div>

      <div className="max-w-2xl mt-4 bg-panel border border-bad/20 rounded-lg p-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Delete product</div>
          <div className="text-xs text-ink-500 mt-0.5">Only possible if it was never sold. Otherwise set the status to Archived.</div>
        </div>
        <ConfirmButton
          action={deleteProduct}
          fields={{ id: product.id }}
          confirm={`Delete “${product.name}” permanently?`}
          className="h-9 px-4 rounded-md border border-bad/30 text-bad text-sm font-medium hover:bg-badSoft transition"
        >
          Delete
        </ConfirmButton>
      </div>
    </section>
  );
}
