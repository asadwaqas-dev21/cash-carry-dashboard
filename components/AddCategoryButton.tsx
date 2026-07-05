"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AddCategoryButton({ onAdded }: { onAdded?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabaseBrowser
        .from('profiles')
        .select('org_id, role')
        .eq('id', user.id)
        .single();
        
      if (profileError || !profile) throw new Error("Could not fetch user profile");
      
      if (profile.role !== 'owner') {
        throw new Error("Only an owner can add categories. Your role is " + profile.role);
      }

      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { error } = await supabaseBrowser
        .from('categories')
        .insert([{ 
          org_id: profile.org_id,
          name: name.trim(),
          slug
        }]);

      if (error) throw error;

      setIsOpen(false);
      setName("");
      if (onAdded) onAdded();
      else router.refresh();
    } catch (err: any) {
      alert("Error adding category: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="h-8 px-3 rounded-md bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition flex items-center gap-1.5"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add Category
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-panel border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-borderMuted flex items-center justify-between bg-canvas">
              <h3 className="font-semibold text-ink-900">Add New Category</h3>
              <button onClick={() => setIsOpen(false)} className="text-ink-400 hover:text-ink-900 transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5">
              <div className="mb-5">
                <label className="block text-xs font-medium text-ink-700 mb-1.5">Category Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                  placeholder="e.g. Beverages"
                  className="w-full px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-200/50 rounded-md transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-md hover:bg-brand-hover transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
