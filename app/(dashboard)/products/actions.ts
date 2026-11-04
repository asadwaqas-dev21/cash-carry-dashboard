'use server';

import { requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { attempt, check, checkAffected, defaultLocationId, num, oneOf, optStr, str, type ActionState } from '@/lib/action-state';
import { PRODUCT_STATUSES } from '@/lib/enums';
import { currentStock, recordStockMovement } from '@/lib/stock';

function amount(formData: FormData, name: string, label: string) {
  const value = num(formData, name);
  if (value < 0) throw new Error(`${label} can't be negative.`);
  return value;
}

function productFields(formData: FormData) {
  const name = str(formData, 'name');
  const sku = str(formData, 'sku');
  if (!name) throw new Error('Enter a product name.');
  if (!sku) throw new Error('Enter a SKU.');

  return {
    name,
    sku,
    barcode: optStr(formData, 'barcode'),
    category_id: optStr(formData, 'category_id'),
    description: optStr(formData, 'description'),
    pack_size: optStr(formData, 'pack_size'),
    status: oneOf(formData, 'status', PRODUCT_STATUSES, 'status'),
    cost_price: amount(formData, 'cost_price', 'Cost price'),
    retail_price: amount(formData, 'retail_price', 'Retail price'),
    wholesale_price: amount(formData, 'wholesale_price', 'Wholesale price'),
    tax_rate: amount(formData, 'tax_rate', 'Tax rate'),
    reorder_level: amount(formData, 'reorder_level', 'Low stock level'),
    reorder_quantity: amount(formData, 'reorder_quantity', 'Reorder quantity'),
  };
}

function revalidateProducts() {
  revalidatePath('/products', 'layout');
  revalidatePath('/inventory');
  revalidatePath('/pos');
  revalidatePath('/categories');
}

export async function addProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await attempt(async () => {
    // Only owners can change the catalogue (also enforced by RLS on products).
    const { user, supabase } = await requireRole('owner');
    const fields = productFields(formData);
    const initialStock = amount(formData, 'initial_stock', 'Opening stock');
    const locationId = await defaultLocationId(supabase, user.orgId);

    const product = check(
      await supabase.from('products').insert({ ...fields, org_id: user.orgId }).select('id').single()
    ) as { id: string };

    check(
      await supabase.from('inventory_balances').upsert(
        {
          org_id: user.orgId,
          location_id: locationId,
          product_id: product.id,
          reorder_level: fields.reorder_level,
          reorder_quantity: fields.reorder_quantity,
        },
        { onConflict: 'org_id,location_id,product_id' }
      )
    );

    await recordStockMovement(supabase, {
      orgId: user.orgId,
      locationId,
      productId: product.id,
      type: 'purchase_receive',
      delta: initialStock,
      unitCost: fields.cost_price,
      userId: user.id,
      notes: 'Opening stock',
    });

    revalidateProducts();
    return 'Product added.';
  });
  if (result?.success) redirect('/products');
  return result;
}

export async function updateProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = str(formData, 'id');
  const result = await attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const fields = productFields(formData);

    const { data: before } = await supabase
      .from('products')
      .select('retail_price, wholesale_price')
      .eq('id', id)
      .eq('org_id', user.orgId)
      .maybeSingle();
    if (!before) throw new Error('Product not found.');

    checkAffected(await supabase.from('products').update(fields).eq('id', id).eq('org_id', user.orgId).select('id'));

    if (Number(before.retail_price) !== fields.retail_price || Number(before.wholesale_price) !== fields.wholesale_price) {
      await supabase.from('product_price_history').insert({
        org_id: user.orgId,
        product_id: id,
        old_retail_price: before.retail_price,
        new_retail_price: fields.retail_price,
        old_wholesale_price: before.wholesale_price,
        new_wholesale_price: fields.wholesale_price,
        changed_by: user.id,
      });
    }

    const locationId = await defaultLocationId(supabase, user.orgId);
    check(
      await supabase.from('inventory_balances').upsert(
        {
          org_id: user.orgId,
          location_id: locationId,
          product_id: id,
          reorder_level: fields.reorder_level,
          reorder_quantity: fields.reorder_quantity,
        },
        { onConflict: 'org_id,location_id,product_id' }
      )
    );

    // A changed stock count is recorded as a count correction.
    if (str(formData, 'stock') !== '') {
      const target = amount(formData, 'stock', 'Stock on hand');
      const onHand = await currentStock(supabase, user.orgId, locationId, id);
      await recordStockMovement(supabase, {
        orgId: user.orgId,
        locationId,
        productId: id,
        type: 'manual_adjustment',
        delta: target - onHand,
        userId: user.id,
        notes: 'Stock corrected from product edit',
      });
    }

    revalidateProducts();
    return 'Product updated.';
  });
  if (result?.success) redirect('/products');
  return result;
}

/** Products that were sold can't be deleted (order history keeps them); archive those instead. */
export async function deleteProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await attempt(async () => {
    const { user, supabase } = await requireRole('owner');
    const id = str(formData, 'id');

    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);
    if (count) {
      throw new Error(`This product is on ${count} order line(s), so it can't be deleted. Set its status to Archived instead.`);
    }

    // Stock history for a never-sold product goes with it.
    check(await supabase.from('stock_movements').delete().eq('product_id', id).eq('org_id', user.orgId));
    checkAffected(await supabase.from('products').delete().eq('id', id).eq('org_id', user.orgId).select('id'));

    revalidateProducts();
    return 'Product deleted.';
  });
  if (result?.success) redirect('/products');
  return result;
}
