import DashboardLayout from '@/components/DashboardLayout';
import { requireUser } from '@/lib/auth';

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
