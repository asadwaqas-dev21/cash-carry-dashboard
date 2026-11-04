'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { attempt, check, checkAffected, num, optStr, str, type ActionState } from '@/lib/action-state';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function revalidateCatalog() {
  revalidatePath('/categories');
  revalidatePath('/products', 'layout');
  revalidatePath('/pos');
}

/** Creates a category, or updates it when the form carries an `id`. */
export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const id = str(formData, 'id');
    const name = str(formData, 'name');
    if (!name) throw new Error('Enter a category name.');

    const fields = {
      name,
      slug: slugify(name) || `category-${Date.now()}`,
      description: optStr(formData, 'description'),
      sort_order: num(formData, 'sort_order'),
    };

    if (id) {
      checkAffected(await supabase.from('categories').update(fields).eq('id', id).eq('org_id', user.orgId).select('id'));
    } else {
      check(await supabase.from('categories').insert({ ...fields, org_id: user.orgId }));
    }
    revalidateCatalog();
    return id ? 'Category updated.' : 'Category added.';
  });
}

/** Products in the category become uncategorized (FK is ON DELETE SET NULL). */
export async function deleteCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    checkAffected(
      await supabase.from('categories').delete().eq('id', str(formData, 'id')).eq('org_id', user.orgId).select('id')
    );
    revalidateCatalog();
    return 'Category deleted.';
  });
}
