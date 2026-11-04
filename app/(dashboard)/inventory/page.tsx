import { requirePageAccess } from '@/lib/auth';
import { formatDateTime, formatNumber, labelize, startOfDaysAgoIso } from '@/lib/format';
import { CLOSED_ORDER_STATUSES } from '@/lib/enums';
import FormModal from '@/components/admin/FormModal';
import { Field, Hidden, Row, Select, TextArea, triggerLink } from '@/components/admin/fields';
import { adjustStock } from './actions';

export const revalidate = 0;

const VELOCITY_DAYS = 30;

function AdjustFields({ item, stock }: { item: any; stock: number }) {
  return (
    <>
      <Hidden name="product_id" value={item.product_id} />
      <Hidden name="location_id" value={item.location_id} />
      <div className="text-xs text-ink-500">
        Currently <span className="font-semibold text-ink-900 num">{formatNumber(stock)}</span> in stock at {item.locations?.name || 'the store'}.
      </div>
      <Select
        label="What happened?"
        name="mode"
        required
        defaultValue="receive"
        options={[
          { value: 'receive', label: 'Stock received (add)' },
          { value: 'return', label: 'Customer return (add)' },
          { value: 'damage', label: 'Damaged / expired (remove)' },
          { value: 'count', label: 'Physical count (set exact quantity)' },
        ]}
      />
      <Row>
        <Field label="Quantity" name="quantity" type="number" min="0" required hint="For a count, the quantity you counted" />
        <Field label="Unit cost (Rs)" name="unit_cost" type="number" step="0.01" min="0" defaultValue={item.products?.cost_price} hint="For received stock" />
      </Row>
      <TextArea label="Notes" name="notes" placeholder="Supplier, invoice number, reason…" />
    </>
  );
}

export default async function InventoryPage() {
  const { user, supabase } = await requirePageAccess('/inventory');
  const isOwner = user.role === 'owner';

  const [{ data }, { data: soldItems }, { data: movements }] = await Promise.all([
    supabase
      .from('inventory_balances')
      .select('*, products(name, sku, status, reorder_level, reorder_quantity, cost_price, category_id, categories(name)), locations(name, code)')
      .order('updated_at', { ascending: false }),
    supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(placed_at, status)')
      .gte('orders.placed_at', startOfDaysAgoIso(VELOCITY_DAYS)),
    supabase
      .from('stock_movements')
      .select('id, type, quantity_delta, quantity_after, notes, created_at, products(name)')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  const balances = data || [];

  // Units sold per product over the last VELOCITY_DAYS days, ignoring cancelled orders.
  const soldByProduct: Record<string, number> = {};
  for (const item of soldItems || []) {
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
    if (!order || CLOSED_ORDER_STATUSES.includes(order.status)) continue;
    soldByProduct[item.product_id] = (soldByProduct[item.product_id] || 0) + Number(item.quantity || 0);
  }

  const rows = balances.map((item: any) => {
    const stock = Number(item.quantity_on_hand || 0);
    const reorderLevel = Number(item.reorder_level || item.products?.reorder_level || 0);
    const reorderQty = Number(item.reorder_quantity || item.products?.reorder_quantity || 0);
    const perDay = (soldByProduct[item.product_id] || 0) / VELOCITY_DAYS;
    const value = Math.max(stock, 0) * Number(item.products?.cost_price || 0);

    const needsRestock = stock <= reorderLevel;
    // Enough for a month of sales, and at least the product's reorder quantity.
    const suggestedQty = needsRestock ? Math.max(reorderQty, Math.ceil(perDay * 30 + reorderLevel - stock), 0) : 0;
    const daysLeft = perDay > 0 ? Math.floor(stock / perDay) : null;
    return { item, stock, reorderLevel, perDay, suggestedQty, daysLeft, value };
  });

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const outOfStockCount = rows.filter((r) => r.stock <= 0).length;
  const lowStockCount = rows.filter((r) => r.stock > 0 && r.stock <= r.reorderLevel).length;

  // Products that need attention first.
  rows.sort((a, b) => Number(b.stock <= b.reorderLevel) - Number(a.stock <= a.reorderLevel) || a.stock - b.stock);

  return (
    <section className="px-6 py-8 flex flex-col h-full overflow-y-auto">
      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-border rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-ink-500 mb-3">Total SKUs</div>
          <div className="text-3xl xl:text-[40px] font-semibold mb-3 tabular num tracking-tight2 leading-none min-w-0 truncate">{formatNumber(balances.length)}</div>
          <div className="text-[13px] text-ink-500 mt-auto">tracked in stock</div>
        </div>

        <div className="bg-white border border-border rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-ink-500 mb-3">Stock value</div>
          <div className="text-3xl xl:text-[40px] font-semibold mb-3 tabular num tracking-tight2 leading-none flex items-baseline gap-1.5 min-w-0 overflow-hidden">
            <span className="text-[14px] text-ink-400 font-semibold tracking-normal shrink-0">Rs</span>
            <span className="truncate">{formatNumber(totalValue)}</span>
          </div>
          <div className="text-[13px] text-ink-500 mt-auto">at cost price</div>
        </div>

        <div className="bg-warnSoft border border-warn/20 rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-warn mb-3">Low stock</div>
          <div className="text-3xl xl:text-[40px] font-semibold text-warn mb-3 tabular num tracking-tight2 leading-none min-w-0 truncate">{formatNumber(lowStockCount)}</div>
          <div className="text-[13px] text-warn/80 mt-auto">at or below reorder level</div>
        </div>

        <div className="bg-badSoft border border-bad/20 rounded-xl p-6 flex flex-col shadow-sm">
          <div className="text-[15px] font-medium text-bad mb-3">Out of stock</div>
          <div className="text-3xl xl:text-[40px] font-semibold text-bad mb-3 tabular num tracking-tight2 leading-none min-w-0 truncate">{formatNumber(outOfStockCount)}</div>
          <div className="text-[13px] text-bad/80 mt-auto">need immediate restock</div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl flex flex-col shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-[17px] font-semibold tracking-tight2 text-ink-900">Inventory Status</h2>
          <div className="text-[14px] text-ink-500 mt-1">Stock levels, with sales speed from the last {VELOCITY_DAYS} days</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-border">
              <tr className="text-[11px] text-ink-400 font-bold uppercase tracking-widest">
                <th className="text-left px-6 py-4">Product</th>
                <th className="text-center px-4 py-4">In Stock</th>
                <th className="text-center px-4 py-4">Reorder At</th>
                <th className="text-center px-4 py-4">Suggested Qty</th>
                <th className="text-right px-4 py-4">Sold / Day</th>
                <th className="text-right px-4 py-4">Days Left</th>
                {isOwner && <th className="text-right px-6 py-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted bg-white">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-ink-500">
                    No products in inventory yet. Products get a stock row when you add them.
                  </td>
                </tr>
              )}
              {rows.map(({ item, stock, reorderLevel, perDay, suggestedQty, daysLeft }) => (
                <tr key={item.id} className="hover:bg-canvas/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[15px] text-ink-900 mb-1">{item.products?.name || 'Unknown product'}</div>
                    <div className="text-[13px] text-ink-400 flex items-center gap-1.5">
                      <span className="font-mono text-[12px] uppercase">{item.products?.sku || '-'}</span>
                      <span className="opacity-50">·</span>
                      <span>{item.products?.categories?.name || 'Uncategorized'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-[15px] font-semibold tabular num ${stock <= 0 ? 'text-bad' : stock <= reorderLevel ? 'text-warn' : 'text-ink-900'}`}>
                      {formatNumber(stock)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-[15px] tabular num text-ink-500">{formatNumber(reorderLevel)}</td>
                  <td className="px-4 py-4 text-center text-[15px] tabular num font-semibold text-ink-900">
                    {suggestedQty > 0 ? formatNumber(suggestedQty) : <span className="text-ink-300 font-normal">—</span>}
                  </td>
                  <td className="px-4 py-4 text-right text-[14px] text-ink-500 tabular num">{perDay > 0 ? formatNumber(perDay, 1) : '0'}</td>
                  <td className="px-4 py-4 text-right">
                    {stock <= 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium bg-badSoft text-bad border border-bad/10">Out</span>
                    ) : daysLeft === null ? (
                      <span className="text-[13px] text-ink-400">No recent sales</span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium border ${daysLeft <= 3 ? 'bg-warnSoft text-warn border-warn/20' : 'bg-canvas text-ink-600 border-border'}`}>
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                      </span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-6 py-4 text-right">
                      <FormModal
                        action={adjustStock}
                        title={`Adjust stock · ${item.products?.name || ''}`}
                        trigger="Adjust"
                        triggerClassName={triggerLink}
                        submitLabel="Save adjustment"
                      >
                        <AdjustFields item={item} stock={stock} />
                      </FormModal>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-ink-900">Recent stock movements</h2>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-borderMuted">
            {(movements || []).length === 0 && (
              <tr><td className="px-6 py-6 text-center text-ink-500">No stock movements yet.</td></tr>
            )}
            {(movements || []).map((m: any) => (
              <tr key={m.id}>
                <td className="px-6 py-3 text-xs text-ink-500 num tabular w-36">{formatDateTime(m.created_at)}</td>
                <td className="py-3 font-medium">{m.products?.name || '-'}</td>
                <td className="py-3 text-ink-500">{labelize(m.type)}{m.notes ? ` · ${m.notes}` : ''}</td>
                <td className={`py-3 text-right num tabular font-medium ${Number(m.quantity_delta) < 0 ? 'text-bad' : 'text-good'}`}>
                  {Number(m.quantity_delta) > 0 ? '+' : ''}{formatNumber(m.quantity_delta)}
                </td>
                <td className="px-6 py-3 text-right text-xs text-ink-400 num tabular">→ {formatNumber(m.quantity_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
