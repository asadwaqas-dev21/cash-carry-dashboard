import { requirePageAccess } from '@/lib/auth';
import { formatMoney, initials, labelize } from '@/lib/format';
import { CLOSED_ORDER_STATUSES, CUSTOMER_STATUSES, CUSTOMER_TYPES } from '@/lib/enums';
import FormModal from '@/components/admin/FormModal';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Field, Hidden, PlusIcon, Row, SearchBox, Select, TextArea, enumOptions, searchPattern, triggerLink } from '@/components/admin/fields';
import { deleteCustomer, saveCustomer } from './actions';

export const revalidate = 0;

function CustomerFields({ customer }: { customer?: any }) {
  const address = (customer?.customer_addresses || []).find((a: any) => a.is_default) || customer?.customer_addresses?.[0];
  return (
    <>
      <Hidden name="id" value={customer?.id} />
      <Hidden name="address_id" value={address?.id} />
      <Field label="Name" name="display_name" required defaultValue={customer?.display_name} placeholder="Person or shop name" />
      <Row>
        <Select label="Type" name="type" options={enumOptions(CUSTOMER_TYPES)} defaultValue={customer?.type || 'individual'} />
        <Select label="Status" name="status" options={enumOptions(CUSTOMER_STATUSES)} defaultValue={customer?.status || 'active'} />
      </Row>
      <Row>
        <Field label="Phone" name="phone" type="tel" defaultValue={customer?.phone} />
        <Field label="Email" name="email" type="email" defaultValue={customer?.email} />
      </Row>
      <Row>
        <Field label="Business name" name="business_name" defaultValue={customer?.business_name} hint="For business customers" />
        <Field label="Credit limit (Rs)" name="credit_limit" type="number" step="0.01" min="0" defaultValue={customer?.credit_limit ?? 0} />
      </Row>
      <Row>
        <Field label="Delivery address" name="address_line1" defaultValue={address?.address_line1} placeholder="Street, building" />
        <Field label="City" name="city" defaultValue={address?.city} />
      </Row>
      <TextArea label="Notes" name="notes" defaultValue={customer?.notes} />
    </>
  );
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const { user, supabase } = await requirePageAccess('/customers');
  const isOwner = user.role === 'owner';

  let query = supabase
    .from('customers')
    .select('*, orders(grand_total, status), customer_addresses(id, address_line1, city, is_default)')
    .order('display_name');
  if (q.trim()) {
    const pattern = searchPattern(q);
    query = query.or(`display_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`);
  }
  const { data: customers } = await query;
  const customersList = customers || [];

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Customers</h1>
          <div className="text-sm text-ink-500 mt-1">Manage wholesale accounts and individual buyers</div>
        </div>
        <div className="flex items-center gap-2">
          <SearchBox placeholder="Search name, phone or email" defaultValue={q} />
          <FormModal action={saveCustomer} title="Add customer" trigger={<><PlusIcon /> Add Customer</>} submitLabel="Add customer" wide>
            <CustomerFields />
          </FormModal>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Customer</th>
                <th className="text-left font-medium py-3">Type</th>
                <th className="text-left font-medium py-3">Contact</th>
                <th className="text-right font-medium py-3">Total Orders</th>
                <th className="text-right font-medium py-3">Lifetime Value</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {customersList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-500">
                    {q ? `No customers match “${q}”.` : 'No customers yet. Use “Add Customer” to create one.'}
                  </td>
                </tr>
              )}
              {customersList.map((item: any) => {
                const orders = (item.orders || []).filter((order: any) => !CLOSED_ORDER_STATUSES.includes(order.status));
                const ltv = orders.reduce((sum: number, order: any) => sum + Number(order.grand_total || 0), 0);
                const isBusiness = item.type === 'business';

                return (
                  <tr key={item.id} className="hover:bg-canvas transition">
                    <td className="px-5 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-xs font-semibold text-ink-700 shrink-0">
                          {initials(item.display_name)}
                        </div>
                        <div>
                          {item.display_name}
                          {item.status !== 'active' && <span className="ml-2 terminal-badge bg-badSoft text-bad">{labelize(item.status)}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`terminal-badge ${isBusiness ? 'bg-brand-soft text-brand' : 'bg-ink-100 text-ink-600'}`}>
                        {isBusiness ? 'Business' : 'Individual'}
                      </span>
                    </td>
                    <td className="py-4 text-ink-500 num tabular text-xs">
                      {item.phone || '-'}
                      {item.email && <div className="text-2xs text-ink-400">{item.email}</div>}
                    </td>
                    <td className="py-4 text-right num tabular font-medium">{orders.length}</td>
                    <td className="py-4 text-right num tabular font-medium text-ink-700">{formatMoney(ltv)}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-3">
                        <FormModal action={saveCustomer} title="Edit customer" trigger="Edit" triggerClassName={triggerLink} wide>
                          <CustomerFields customer={item} />
                        </FormModal>
                        {isOwner && (
                          <ConfirmButton action={deleteCustomer} fields={{ id: item.id }} confirm={`Delete “${item.display_name}”? Their past orders stay but lose the customer link.`}>
                            Delete
                          </ConfirmButton>
                        )}
                      </span>
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
