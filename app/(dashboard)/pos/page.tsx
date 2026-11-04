import { requirePageAccess } from '@/lib/auth';
import POSClient from '@/components/POSClient';

export const revalidate = 0;

export default async function POSPage() {
  const { supabase } = await requirePageAccess('/pos');
  const { data: products } = await supabase
    .from('products')
    .select('id, name, retail_price, categories(name)')
    .eq('status', 'active')
    .order('name');
  const formattedProducts = (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    retail_price: p.retail_price,
    categories: Array.isArray(p.categories) ? p.categories[0] : p.categories
  }));

  // Pass products to the Client Component
  return <POSClient products={formattedProducts} />;
}
