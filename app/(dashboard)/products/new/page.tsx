import Link from 'next/link';
import { requirePageAccess } from '@/lib/auth';
import ActionForm from '@/components/admin/ActionForm';
import ProductFields from '../ProductFields';
import { addProduct } from '../actions';

export const revalidate = 0;

export default async function NewProductPage() {
  const { supabase } = await requirePageAccess('/products/new');
  const { data: categories } = await supabase.from('categories').select('id, name').order('name');

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
        <ActionForm action={addProduct} submitLabel="Save product">
          <ProductFields categories={categories || []} />
        </ActionForm>
      </div>
    </section>
  );
}
