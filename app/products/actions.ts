'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function getOrCreateOrganizationId() {
  const { data: orgs, error: orgReadError } = await supabase
    .from('organizations')
    .select('id')
    .limit(1);

  if (orgReadError) {
    console.error('Error reading organization:', orgReadError);
  }

  let existingOrgId = orgs?.[0]?.id;

  if (existingOrgId) {
    // Ensure a location exists for this org
    const { data: locs } = await supabase.from('locations').select('id').eq('org_id', existingOrgId).limit(1);
    if (!locs || locs.length === 0) {
      await supabase.from('locations').insert({
        org_id: existingOrgId,
        name: 'Main Location',
        code: 'MAIN',
        type: 'warehouse',
        country: 'Pakistan',
      });
    }
    return existingOrgId;
  }

  const { data: org, error: orgCreateError } = await supabase
    .from('organizations')
    .insert({
      name: 'Kirana Cash & Carry',
      slug: 'kirana-cash-carry',
      currency_code: 'Rs',
      timezone: 'Asia/Karachi',
    })
    .select('id')
    .single();

  if (orgCreateError || !org?.id) {
    console.error('Error creating organization:', orgCreateError);
    return null;
  }

  const { error: locationError } = await supabase.from('locations').insert({
    org_id: org.id,
    name: 'Main Location',
    code: 'MAIN',
    type: 'warehouse',
    country: 'Pakistan',
  });

  if (locationError) {
    console.error('Error creating default location:', locationError);
  }

  return org.id;
}

export async function addProduct(formData: FormData) {
  const org_id = await getOrCreateOrganizationId();

  if (!org_id) {
    redirect('/products/new?error=missing-organization');
  }

  const newProduct = {
    org_id,
    name: formData.get('name') as string,
    sku: formData.get('sku') as string,
    barcode: formData.get('barcode') as string || null,
    cost_price: parseFloat(formData.get('cost_price') as string) || 0,
    retail_price: parseFloat(formData.get('retail_price') as string) || 0,
    wholesale_price: parseFloat(formData.get('wholesale_price') as string) || 0,
    reorder_level: parseInt(formData.get('reorder_level') as string) || 0,
    reorder_quantity: parseInt(formData.get('reorder_quantity') as string) || 0,
    category_id: formData.get('category_id') as string || null,
  };

  const { data: product, error } = await supabase
    .from('products')
    .insert(newProduct)
    .select('id, org_id, reorder_level, reorder_quantity')
    .single();

  if (error) {
    console.error('Error adding product:', error);
    if (error.code === '23505') {
      redirect('/products/new?error=duplicate-sku');
    }
    redirect('/products/new?error=server-error');
  }

  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', org_id)
    .limit(1)
    .maybeSingle();

  const initialStock = parseInt(formData.get('initial_stock') as string) || 0;

  if (product && location) {
    const { error: inventoryError } = await supabase.from('inventory_balances').insert({
      org_id: org_id,
      location_id: location.id,
      product_id: product.id,
      quantity_on_hand: initialStock,
      reorder_level: product.reorder_level,
      reorder_quantity: product.reorder_quantity,
    });

    if (inventoryError) {
      console.error('Error creating inventory balance:', inventoryError);
      throw new Error(inventoryError.message);
    }
  }

  revalidatePath('/products', 'layout');
  revalidatePath('/inventory', 'layout');
  redirect('/products');
}

export async function updateProduct(id: string, formData: FormData) {
  const org_id = await getOrCreateOrganizationId();

  if (!org_id) {
    redirect(`/products/edit/${id}?error=missing-organization`);
  }

  const updatedProduct = {
    name: formData.get('name') as string,
    sku: formData.get('sku') as string,
    barcode: formData.get('barcode') as string || null,
    cost_price: parseFloat(formData.get('cost_price') as string) || 0,
    retail_price: parseFloat(formData.get('retail_price') as string) || 0,
    wholesale_price: parseFloat(formData.get('wholesale_price') as string) || 0,
    reorder_level: parseInt(formData.get('reorder_level') as string) || 0,
    reorder_quantity: parseInt(formData.get('reorder_quantity') as string) || 0,
    category_id: formData.get('category_id') as string || null,
  };

  const { error } = await supabase
    .from('products')
    .update(updatedProduct)
    .eq('id', id)
    .eq('org_id', org_id);

  if (error) {
    console.error('Error updating product:', error);
    if (error.code === '23505') {
      redirect(`/products/edit/${id}?error=duplicate-sku`);
    }
    redirect(`/products/edit/${id}?error=server-error`);
  }

  const stockStr = formData.get('stock');
  if (stockStr !== null && stockStr !== '') {
    const newStock = parseInt(stockStr as string) || 0;

    const { data: location } = await supabase
      .from('locations')
      .select('id')
      .eq('org_id', org_id)
      .limit(1)
      .maybeSingle();

    if (location) {
      // First check if inventory_balances row exists
      const { data: existingBalance } = await supabase
        .from('inventory_balances')
        .select('id')
        .eq('org_id', org_id)
        .eq('location_id', location.id)
        .eq('product_id', id)
        .maybeSingle();

      if (existingBalance) {
        const { error: inventoryError } = await supabase
          .from('inventory_balances')
          .update({
            quantity_on_hand: newStock,
            reorder_level: updatedProduct.reorder_level,
            reorder_quantity: updatedProduct.reorder_quantity,
          })
          .eq('org_id', org_id)
          .eq('location_id', location.id)
          .eq('product_id', id);

        if (inventoryError) {
          console.error('Error updating inventory balance:', inventoryError);
        }
      } else {
        const { error: inventoryError } = await supabase
          .from('inventory_balances')
          .insert({
            org_id,
            location_id: location.id,
            product_id: id,
            quantity_on_hand: newStock,
            reorder_level: updatedProduct.reorder_level,
            reorder_quantity: updatedProduct.reorder_quantity,
          });

        if (inventoryError) {
          console.error('Error creating inventory balance:', inventoryError);
        }
      }
    }
  }

  revalidatePath('/products', 'layout');
  revalidatePath('/inventory', 'layout');
  redirect('/products');
}

export async function deleteProduct(id: string) {
  const org_id = await getOrCreateOrganizationId();

  if (!org_id) {
    redirect(`/products/edit/${id}?error=missing-organization`);
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('org_id', org_id);

  if (error) {
    console.error('Error deleting product:', error);
    throw new Error(error.message);
  }

  revalidatePath('/products', 'layout');
  revalidatePath('/inventory', 'layout');
  redirect('/products');
}
