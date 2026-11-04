import { requirePageAccess } from '@/lib/auth';
import FormModal from '@/components/admin/FormModal';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Field, Hidden, PlusIcon, Row, TextArea, triggerLink } from '@/components/admin/fields';
import { deleteCategory, saveCategory } from './actions';

export const revalidate = 0;

function CategoryFields({ category }: { category?: any }) {
  return (
    <>
      <Hidden name="id" value={category?.id} />
      <Field label="Name" name="name" required defaultValue={category?.name} placeholder="e.g. Beverages" />
      <TextArea label="Description" name="description" defaultValue={category?.description} />
      <Row>
        <Field label="Sort order" name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} hint="Lower numbers show first" />
      </Row>
    </>
  );
}

export default async function CategoriesPage() {
  const { user, supabase } = await requirePageAccess('/categories');
  const isOwner = user.role === 'owner';
  const { data } = await supabase
    .from('categories')
    .select('id, name, description, sort_order, products(id)')
    .order('sort_order')
    .order('name');
  const categories = data || [];

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Categories</h1>
          <div className="text-sm text-ink-500 mt-1">Group products for the catalog and the POS</div>
        </div>
        {isOwner && (
          <FormModal action={saveCategory} title="Add category" trigger={<><PlusIcon /> Add Category</>} submitLabel="Add category">
            <CategoryFields />
          </FormModal>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {categories.length === 0 && (
          <div className="col-span-3 p-8 text-center text-ink-500 bg-panel border border-border rounded-lg">
            No categories yet.{isOwner ? ' Use “Add Category” to create the first one.' : ''}
          </div>
        )}
        {categories.map((cat: any) => (
          <div key={cat.id} className="bg-panel border border-border rounded-lg p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-canvas border border-borderMuted flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-700"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{cat.name}</div>
              <div className="text-xs text-ink-500 num tabular">{cat.products?.length || 0} products</div>
              {cat.description && <div className="text-2xs text-ink-400 truncate mt-0.5">{cat.description}</div>}
            </div>
            {isOwner && (
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <FormModal action={saveCategory} title="Edit category" trigger="Edit" triggerClassName={triggerLink}>
                  <CategoryFields category={cat} />
                </FormModal>
                <ConfirmButton
                  action={deleteCategory}
                  fields={{ id: cat.id }}
                  confirm={`Delete “${cat.name}”? Its ${cat.products?.length || 0} products will become uncategorized.`}
                >
                  Delete
                </ConfirmButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
