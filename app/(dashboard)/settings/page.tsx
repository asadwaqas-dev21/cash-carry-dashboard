import { requirePageAccess } from '@/lib/auth';
import SettingsForm, { type SettingsData } from './SettingsForm';

export const revalidate = 0;

export default async function SettingsPage() {
  const { user, supabase } = await requirePageAccess('/settings');
  const isOwner = user.role === 'owner';

  const [{ data: authData }, { data: profile }, orgResult, locationResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('phone, preferences').eq('id', user.id).maybeSingle(),
    isOwner
      ? supabase.from('organizations').select('name, currency_code, timezone, default_tax_rate').eq('id', user.orgId).maybeSingle()
      : Promise.resolve({ data: null }),
    isOwner
      ? supabase
          .from('locations')
          .select('id, name, address_line1, city, country, phone')
          .eq('org_id', user.orgId)
          .order('created_at')
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const authUser = authData?.user;
  const org = orgResult.data;
  const location = locationResult.data;

  const data: SettingsData = {
    isOwner,
    userId: user.id,
    store: org
      ? {
          name: org.name,
          currency_code: String(org.currency_code).trim(),
          timezone: org.timezone,
          default_tax_rate: Number(org.default_tax_rate),
        }
      : { name: '', currency_code: 'PKR', timezone: 'Asia/Karachi', default_tax_rate: 0 },
    location: location
      ? {
          id: location.id,
          name: location.name,
          address_line1: location.address_line1 ?? '',
          city: location.city ?? '',
          country: location.country ?? 'Pakistan',
          phone: location.phone ?? '',
        }
      : { id: '', name: 'Main Location', address_line1: '', city: '', country: 'Pakistan', phone: '' },
    profile: {
      fullName: user.fullName,
      email: user.email,
      phone: profile?.phone ?? '',
      avatarUrl: user.avatarUrl,
      role: user.role,
      notifications: (profile?.preferences?.notifications ?? {}) as Record<string, boolean>,
    },
    account: {
      providers: Array.from(new Set((authUser?.identities ?? []).map((identity) => identity.provider))),
      pendingEmail: authUser?.new_email ?? null,
    },
  };

  return <SettingsForm data={data} />;
}
