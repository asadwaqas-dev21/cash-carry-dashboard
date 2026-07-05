"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function CategorySelect({ defaultValue }: { defaultValue?: any }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabaseBrowser.from("categories").select("id, name").order("name");
      setCategories(data || []);
      setLoading(false);
    }
    fetchCategories();
  }, []);

  return (
    <select 
      id="category_id" 
      name="category_id" 
      disabled={loading} 
      defaultValue={defaultValue}
      className="h-10 px-3 rounded-md border border-border bg-canvas text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
    >
      <option value="">{loading ? "Loading categories..." : "No Category"}</option>
      {categories.map((cat: any) => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
  );
}
