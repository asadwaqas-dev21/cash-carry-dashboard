import { requirePageAccess } from '@/lib/auth';
import { formatMoney, initials, labelize } from '@/lib/format';
import { ROLES, ROLE_LABELS } from '@/lib/roles';
import { STAFF_STATUSES } from '@/lib/enums';
import FormModal from '@/components/admin/FormModal';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Field, Hidden, PlusIcon, Row, Select, TextArea, enumOptions, triggerLink } from '@/components/admin/fields';
import { deleteStaff, saveStaff } from './actions';

export const revalidate = 0;

function StaffFields({ person }: { person?: any }) {
  return (
    <>
      <Hidden name="id" value={person?.id} />
      <Field label="Full name" name="full_name" required defaultValue={person?.full_name} />
      <Row>
        <Field label="Employee code" name="employee_code" defaultValue={person?.employee_code} placeholder="Auto, e.g. EMP-001" />
        <Field label="Phone" name="phone" type="tel" defaultValue={person?.phone} />
      </Row>
      <Field label="Email" name="email" type="email" defaultValue={person?.email} />
      <Row>
        <Select label="Role" name="role" options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} defaultValue={person?.role || 'sales_person'} />
        <Select label="Status" name="status" options={enumOptions(STAFF_STATUSES)} defaultValue={person?.status || 'active'} />
      </Row>
      <Row>
        <Field label="Hire date" name="hire_date" type="date" defaultValue={person?.hire_date} />
        <Field label="Monthly salary (Rs)" name="salary" type="number" step="0.01" min="0" defaultValue={person?.salary} />
      </Row>
      <TextArea label="Notes" name="notes" defaultValue={person?.notes} />
    </>
  );
}

export default async function StaffPage() {
  const { supabase } = await requirePageAccess('/staff');
  const { data: staff } = await supabase.from('staff').select('*').order('full_name');
  const staffList = staff || [];

  return (
    <section className="px-6 py-5 flex flex-col h-full">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight2">Staff & Team</h1>
          <div className="text-sm text-ink-500 mt-1">Employee records. Dashboard sign-in access is managed in Team &amp; Access.</div>
        </div>
        <FormModal action={saveStaff} title="Add staff member" trigger={<><PlusIcon /> Add Staff Member</>} submitLabel="Add staff member">
          <StaffFields />
        </FormModal>
      </div>

      <div className="bg-panel border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 sticky top-0 z-10 border-b border-border">
              <tr className="text-2xs text-ink-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-3">Name</th>
                <th className="text-left font-medium py-3">Role</th>
                <th className="text-left font-medium py-3">Contact</th>
                <th className="text-left font-medium py-3">Status</th>
                <th className="text-right font-medium py-3">Salary</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-500">
                    No staff members yet. Use “Add Staff Member” to create one.
                  </td>
                </tr>
              )}
              {staffList.map((person: any) => (
                <tr key={person.id} className="hover:bg-canvas transition">
                  <td className="px-5 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {initials(person.full_name)}
                      </div>
                      <div>
                        {person.full_name}
                        <div className="text-2xs text-ink-400 num">{person.employee_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-ink-700">{ROLE_LABELS[person.role as keyof typeof ROLE_LABELS] || labelize(person.role)}</td>
                  <td className="py-4 text-ink-500 num tabular text-xs">
                    {person.phone || '-'}
                    {person.email && <div className="text-2xs text-ink-400">{person.email}</div>}
                  </td>
                  <td className="py-4">
                    <span className={`terminal-badge ${person.status === 'active' ? 'bg-goodSoft text-good' : 'bg-ink-100 text-ink-500'}`}>
                      {labelize(person.status)}
                    </span>
                  </td>
                  <td className="py-4 text-right num tabular text-ink-700">{person.salary != null ? formatMoney(person.salary) : '-'}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-3">
                      <FormModal action={saveStaff} title="Edit staff member" trigger="Edit" triggerClassName={triggerLink}>
                        <StaffFields person={person} />
                      </FormModal>
                      <ConfirmButton action={deleteStaff} fields={{ id: person.id }} confirm={`Delete “${person.full_name}”?`}>
                        Delete
                      </ConfirmButton>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
