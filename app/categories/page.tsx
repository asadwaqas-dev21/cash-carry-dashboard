"use client";

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import AddCategoryButton from '@/components/AddCategoryButton';

export default function CategoriesPage() {
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabaseBrowser
      .from('categories')
      .select(`
        *,
        products (id)
      `)
      .order('name');
    
    setCategoriesList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Categories</h1>
          <div className="text-sm text-ink-500 mt-1">Manage product classification and hierarchy</div>
        </div>
        <AddCategoryButton onAdded={fetchCategories} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 p-8 text-center text-ink-500 bg-panel border border-border rounded-lg">
            Loading categories securely...
          </div>
        ) : categoriesList.length === 0 ? (
          <div className="col-span-3 p-8 text-center text-ink-500 bg-panel border border-border rounded-lg">
            No categories found. Please add categories to your Supabase database.
          </div>
        ) : (
          categoriesList.map((cat: any) => (
            <div key={cat.id} className="bg-panel border border-border rounded-lg p-5 flex items-center gap-4 hover:border-brand/50 transition cursor-pointer">
              <div className={`w-12 h-12 rounded-lg ${cat.color_theme || 'bg-stone-100/50'} flex items-center justify-center`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-700"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </div>
              <div>
                <div className="font-semibold">{cat.name}</div>
                <div className="text-xs text-ink-500 num tabular">{cat.products?.length || 0} items</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
