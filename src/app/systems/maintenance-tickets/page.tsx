import MaintenanceLogbookClient from '@/components/system/MaintenanceLogbookClient';
import { userHasActiveSubRole } from '@/backend/services/system/user-subrole';
import { CLOSE_TICKET_ROLES, type Role } from '@/lib/auth/roles';
import { getUserSession } from '@/lib/auth/server-session';

export default async function MaintenanceLogbookPage() {
  const session = await getUserSession();
  const role = session?.user?.role ?? '';
  const canIntervene = role === 'PIC'
    ? await userHasActiveSubRole(session!.user.userId, 'PIC_TECHNICIAN')
    : false;

  const canCloseByRole = CLOSE_TICKET_ROLES.includes(role as Role);

  return <MaintenanceLogbookClient canIntervene={canIntervene} canCloseByRole={canCloseByRole} />;
}
