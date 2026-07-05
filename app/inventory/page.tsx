import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/lib/format';
import Link from 'next/link';

export const revalidate = 0;

export default async function InventoryPage() {
  const { data } = await supabase
    .from('inventory_balances')
    .select('*, products(name, sku, reorder_level, wholesale_price, category_id, categories(name)), locations(name, code)')
    .order('updated_at', { ascending: false });

  const balances = data || [];
  
  let totalSKUs = 0;
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  
  const categoryIds = new Set();

  const alerts = balances.filter((item: any) => {
    const stock = Number(item.quantity_on_hand || 0);
    const reorderLevel = Number(item.reorder_level || item.products?.reorder_level || 0);
    const price = Number(item.products?.wholesale_price || 0);
    
    totalSKUs++;
    totalValue += (stock > 0 ? stock : 0) * price;
    
    if (item.products?.category_id) {
      categoryIds.add(item.products.category_id);
    }
    
    if (stock <= 0) {
      outOfStockCount++;
      return true; // Include in alerts
    } else if (stock <= reorderLevel) {
      lowStockCount++;
      return true; // Include in alerts
    }
    return false;
  });
  
  const categoriesCount = categoryIds.size;

  return (
    <section className="px-6 py-8 flex flex-col h-full overflow-y-auto">
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {/* Card 1: Total SKUs */}
        <div className="bg-white border border-border rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-ink-500 mb-3">Total SKUs</div>
          <div className="text-3xl xl:text-[40px] font-semibold mb-3 tabular num tracking-tight2 leading-none min-w-0 truncate">{formatNumber(totalSKUs)}</div>
          <div className="text-[13px] text-ink-500 mt-auto">across {categoriesCount} categories</div>
        </div>

        {/* Card 2: Stock value */}
        <div className="bg-white border border-border rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-ink-500 mb-3">Stock value</div>
          <div className="text-3xl xl:text-[40px] font-semibold mb-3 tabular num tracking-tight2 leading-none flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-[14px] text-ink-400 font-semibold tracking-normal shrink-0">Rs</span>
            <span className="truncate">{formatNumber(totalValue)}</span>
          </div>
          <div className="text-[13px] text-ink-500 mt-auto">at wholesale cost</div>
        </div>

        {/* Card 3: Low stock */}
        <div className="bg-warnSoft border border-warn/20 rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-warn mb-3">Low stock</div>
          <div className="text-3xl xl:text-[40px] font-semibold text-warn mb-3 tabular num tracking-tight2 leading-none min-w-0 truncate">{formatNumber(lowStockCount)}</div>
          <div className="text-[13px] text-warn/80 mt-auto">below reorder level</div>
        </div>

        {/* Card 4: Out of stock */}
        <div className="bg-badSoft border border-bad/20 rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-bad mb-3">Out of stock</div>
          <div className="text-3xl xl:text-[40px] font-semibold text-bad mb-3 tabular num tracking-tight2 leading-none min-w-0 truncate">{formatNumber(outOfStockCount)}</div>
          <div className="text-[13px] text-bad/80 mt-auto">need immediate restock</div>
        </div>
      </div>

      {/* Restock needed table */}
      <div className="bg-white border border-border rounded-xl flex flex-col shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-white">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight2 text-ink-900">Inventory Status</h2>
            <div className="text-[14px] text-ink-500 mt-1">Current stock levels and reorder suggestions</div>
          </div>
          <button className="text-brand font-medium hover:text-brand-hover transition text-[14px]">
            Create purchase order
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-border">
              <tr className="text-[11px] text-ink-400 font-bold uppercase tracking-widest">
                <th className="text-left px-6 py-4">Product</th>
                <th className="text-center px-4 py-4">In Stock</th>
                <th className="text-center px-4 py-4">Reorder At</th>
                <th className="text-left px-4 py-4">Suggested Qty</th>
                <th className="text-right px-4 py-4">Sales Velocity</th>
                <th className="text-right px-6 py-4">Days Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted bg-white">
              {balances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-ink-500">
                    No products found in inventory.
                  </td>
                </tr>
              )}
              {balances.map((item: any) => {
                const stock = Number(item.quantity_on_hand || 0);
                const reorderLevel = Number(item.reorder_level || item.products?.reorder_level || 0);
                
                // Mock metrics to match the design
                const baseStrLength = item.products?.name?.length || 10;
                const salesVelocity = (baseStrLength % 15) * 2 + 8; // e.g. 8 to 36/day
                const daysLeft = stock > 0 ? Math.floor(stock / salesVelocity) : 0;
                
                // Suggested is roughly 1 month of stock + reorder buffer
                const suggestedQty = (reorderLevel || 10) + (salesVelocity * 20);
                // Math for the progress bar
                const progressWidth = Math.min(100, Math.max(10, (suggestedQty / (suggestedQty * 1.5)) * 100));

                return (
                  <tr key={item.id} className="hover:bg-canvas/50 transition group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[15px] text-ink-900 mb-1">{item.products?.name || 'Unknown product'}</div>
                      <div className="text-[13px] text-ink-400 flex items-center gap-1.5">
                        <span className="font-mono text-[12px] uppercase">{item.products?.sku || '-'}</span>
                        <span className="opacity-50">·</span>
                        <span>{item.products?.categories?.name || 'Uncategorized'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-[15px] font-semibold tabular num ${stock <= 0 ? 'text-bad' : 'text-ink-900'}`}>
                        {formatNumber(stock)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-[15px] tabular num text-ink-500">
                      {formatNumber(reorderLevel)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-semibold tabular num w-8 text-ink-900">{formatNumber(suggestedQty)}</span>
                        <div className="flex-1 h-[4px] bg-ink-200/40 rounded-full overflow-hidden min-w-[60px] max-w-[100px]">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${progressWidth}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-[14px] text-ink-500">
                      {salesVelocity}/day
                    </td>
                    <td className="px-6 py-4 text-right">
                      {stock <= 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-badSoft text-bad border border-bad/10">
                          0 days
                        </span>
                      ) : daysLeft <= 3 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-warnSoft text-warn border border-warn/20">
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-canvas text-ink-600 border border-border">
                          {daysLeft} days
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
