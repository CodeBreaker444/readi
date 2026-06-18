import MaintenanceLogbookClient from '@/components/system/MaintenanceLogbookClient';
import { userHasActiveSubRole } from '@/backend/services/system/user-subrole';
import { getUserSession } from '@/lib/auth/server-session';

const MANAGE_TICKET_ROLES = ['RM', 'ADMIN', 'SUPERADMIN'];

export default async function MaintenanceLogbookPage() {
  const session = await getUserSession();
  const role = session?.user?.role ?? '';
  const canManage = MANAGE_TICKET_ROLES.includes(role);
  const canIntervene = role === 'PIC'
    ? await userHasActiveSubRole(session!.user.userId, 'PIC_TECHNICIAN')
    : false;

  return <MaintenanceLogbookClient canClose={canManage} canAssign={canManage} canCreate={canManage} canDownload={canManage} canIntervene={canIntervene} />;
}
