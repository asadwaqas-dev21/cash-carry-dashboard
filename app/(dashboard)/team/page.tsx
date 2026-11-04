import { requirePageAccess } from '@/lib/auth';
import { ROLES, ROLE_LABELS, PAGE_ACCESS, type Role } from '@/lib/roles';
import { formatDateTime, initials } from '@/lib/format';
import { changeMemberRole, revokeInvite, setMemberActive, setMemberPassword } from './actions';
import InviteForm from './InviteForm';
import { hasAdminKey } from '@/lib/supabase-admin';
import FormModal from '@/components/admin/FormModal';
import { Field, Hidden } from '@/components/admin/fields';

export const revalidate = 0;

type Member = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  last_seen_at: string | null;
};

type Invite = { id: string; email: string; role: Role; created_at: string };

export default async function TeamPage() {
  const { user, supabase } = await requirePageAccess('/team');

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, is_active, last_seen_at')
      .eq('org_id', user.orgId)
      .order('created_at'),
    supabase
      .from('user_invites')
      .select('id, email, role, created_at')
      .eq('org_id', user.orgId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const memberList = (members || []) as Member[];
  const inviteList = (invites || []) as Invite[];
  const salesSections = Object.entries(PAGE_ACCESS)
    .filter(([path, roles]) => path !== '/' && !path.slice(1).includes('/') && roles.includes('sales_person'))
    .map(([path]) => path.slice(1));

  return (
    <section className="px-6 py-5 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight2">Team &amp; Access</h1>
        <div className="text-sm text-ink-500 mt-1">Who can sign in to the dashboard, and what each role can open</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-sm font-semibold">{ROLE_LABELS.owner}</div>
          <div className="text-xs text-ink-500 mt-1">Everything, including money, analytics, staff, settings and this page.</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-sm font-semibold">{ROLE_LABELS.sales_person}</div>
          <div className="text-xs text-ink-500 mt-1 capitalize">Overview, {salesSections.join(', ')}. Can&apos;t add or edit products.</div>
        </div>
      </div>

      <InviteForm enabled={hasAdminKey} />

      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas/50 border-b border-border">
            <tr className="text-2xs text-ink-400 uppercase tracking-wider">
              <th className="text-left font-medium px-5 py-3">Member</th>
              <th className="text-left font-medium py-3">Role</th>
              <th className="text-left font-medium py-3">Last seen</th>
              <th className="text-right font-medium px-5 py-3">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderMuted">
            {memberList.map((member) => {
              const isSelf = member.id === user.id;
              return (
                <tr key={member.id} className={member.is_active ? '' : 'opacity-60'}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.avatar_url} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs font-semibold">
                          {initials(member.full_name)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{member.full_name}{isSelf && <span className="text-ink-400 font-normal"> (you)</span>}</div>
                        <div className="text-xs text-ink-500">{member.email || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    {isSelf ? (
                      <span className="bg-canvas border border-border px-2 py-1 rounded text-xs text-ink-500">{ROLE_LABELS[member.role]}</span>
                    ) : (
                      <form action={changeMemberRole} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={member.id} />
                        <select name="role" defaultValue={member.role} className="h-8 px-2 bg-white border border-border rounded-md text-xs">
                          {ROLES.map((role) => (
                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                          ))}
                        </select>
                        <button type="submit" className="h-8 px-2.5 rounded-md border border-border text-xs hover:border-ink-400">Save</button>
                      </form>
                    )}
                  </td>
                  <td className="py-3 text-xs text-ink-500 num">{formatDateTime(member.last_seen_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1">
                    {hasAdminKey && member.email && (
                      <FormModal
                        action={setMemberPassword}
                        title={`Set password · ${member.full_name}`}
                        description="They sign in with their email and this password."
                        trigger="Set password"
                        triggerClassName="h-8 px-3 rounded-md text-xs font-medium text-brand hover:bg-brand-soft"
                        submitLabel="Set password"
                      >
                        <Hidden name="id" value={member.id} />
                        <Field label="New password" name="password" type="text" required hint="At least 8 characters" />
                      </FormModal>
                    )}
                    {isSelf ? (
                      <span className="text-xs text-ink-400 px-3">-</span>
                    ) : (
                      <form action={setMemberActive}>
                        <input type="hidden" name="id" value={member.id} />
                        <input type="hidden" name="active" value={member.is_active ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className={`h-8 px-3 rounded-md text-xs font-medium ${member.is_active ? 'text-bad hover:bg-badSoft' : 'text-good hover:bg-goodSoft'}`}
                        >
                          {member.is_active ? 'Turn off access' : 'Restore access'}
                        </button>
                      </form>
                    )}
                    </span>
                  </td>
                </tr>
              );
            })}
            {inviteList.map((invite) => (
              <tr key={invite.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-dashed border-ink-400 text-ink-400 flex items-center justify-center text-xs">@</div>
                    <div>
                      <div className="font-medium">{invite.email}</div>
                      <div className="text-xs text-warn">Invited · hasn&apos;t signed in yet</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <span className="bg-canvas border border-border px-2 py-1 rounded text-xs text-ink-500">{ROLE_LABELS[invite.role]}</span>
                </td>
                <td className="py-3 text-xs text-ink-500 num">Invited {formatDateTime(invite.created_at)}</td>
                <td className="px-5 py-3 text-right">
                  <form action={revokeInvite}>
                    <input type="hidden" name="id" value={invite.id} />
                    <button type="submit" className="h-8 px-3 rounded-md text-xs font-medium text-bad hover:bg-badSoft">Cancel invite</button>
                  </form>
                </td>
              </tr>
            ))}
            {memberList.length === 0 && inviteList.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-500">No team members yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
