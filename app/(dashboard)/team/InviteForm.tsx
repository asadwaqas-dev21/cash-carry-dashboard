import ActionForm from '@/components/admin/ActionForm';
import { Field, Row, Select } from '@/components/admin/fields';
import { ROLES, ROLE_LABELS } from '@/lib/roles';
import { createMember } from './actions';

/** Owner creates a login directly: no invite or confirmation email is sent. */
export default function InviteForm({ enabled }: { enabled: boolean }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="text-sm font-semibold mb-1">Add team member</div>
      <div className="text-xs text-ink-500 mb-3">
        Creates their login right away. Give them the email and password; they sign in on the login page with “Password”.
      </div>
      {enabled ? (
        <ActionForm action={createMember} submitLabel="Create login" resetOnSuccess>
          <Row>
            <Field label="Name" name="full_name" required />
            <Field label="Email" name="email" type="email" required placeholder="name@company.com" />
          </Row>
          <Row>
            <Field label="Password" name="password" type="text" required hint="At least 8 characters" />
            <Select label="Role" name="role" options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} defaultValue="sales_person" />
          </Row>
        </ActionForm>
      ) : (
        <div className="p-3 text-xs text-warn bg-warnSoft border border-warn/20 rounded-md">
          To create logins here, add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to <code className="font-mono">.env.local</code>{' '}
          (Supabase → Project Settings → API keys → service_role / secret key) and restart the app.
        </div>
      )}
    </div>
  );
}
