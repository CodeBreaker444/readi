import MaintenanceLogbookClient from '@/components/system/MaintenanceLogbookClient';
import { userHasActiveSubRole } from '@/backend/services/system/user-subrole';
import { getUserSession } from '@/lib/auth/server-session';

export default async function MaintenanceLogbookPage() {
  const session = await getUserSession();
  const role = session?.user?.role ?? '';
  const canIntervene = role === 'PIC'
    ? await userHasActiveSubRole(session!.user.userId, 'PIC_TECHNICIAN')
    : false;

  // Ticket management access (close/assign/create/download) is resolved client-side
  // via usePermissions() against the 'systems_maintenance_tickets' feature key.
  return <MaintenanceLogbookClient canIntervene={canIntervene} />;
}
