import { getSuperAdminOverview } from '@/backend/services/superadmin/superadmin-service';
import SuperAdminDashboard from '@/components/superadmin/SuperAdminDashboard';
import { getUserSession } from '@/lib/auth/server-session';
import { redirect } from 'next/navigation';

export default async function SuperAdminPage() {
  const session = await getUserSession();

  if (!session) {
    redirect('/api/auth/logout');
  }

  if (session.user.role !== 'SUPERADMIN') {
    redirect('/unauthorized');
  }

  let initialData = null;
  try {
    initialData = await getSuperAdminOverview();
  } catch (err) {
    console.error('[SuperAdminPage] SSR overview fetch failed, falling back to client-side fetch:', err);
  }

  return <SuperAdminDashboard initialData={initialData} />;
}
