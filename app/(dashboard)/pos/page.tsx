import { requirePageAccess } from '@/lib/auth';
import POSClient from '@/components/POSClient';

export const revalidate = 0;

export default async function POSPage() {
  const { supabase } = await requirePageAccess('/pos');
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, barcode, retail_price, tax_rate, categories(name), inventory_balances(quantity_on_hand)')
    .eq('status', 'active')
    .order('name');

  const formattedProducts = (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    retail_price: Number(p.retail_price || 0),
    tax_rate: Number(p.tax_rate || 0),
    stock: (p.inventory_balances || []).reduce((sum: number, row: any) => sum + Number(row.quantity_on_hand || 0), 0),
    categories: Array.isArray(p.categories) ? p.categories[0] : p.categories,
  }));

  return <POSClient products={formattedProducts} />;
}
