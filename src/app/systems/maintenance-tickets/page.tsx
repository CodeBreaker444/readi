import MaintenanceLogbookClient from '@/components/system/MaintenanceLogbookClient';
import { getUserSession } from '@/lib/auth/server-session';

const CLOSE_TICKET_ROLES = ['RM', 'ADMIN', 'SUPERADMIN'];

export default async function MaintenanceLogbookPage() {
  const session = await getUserSession();
  const canClose = CLOSE_TICKET_ROLES.includes(session?.user?.role ?? '');

  return <MaintenanceLogbookClient canClose={canClose} />;
}
