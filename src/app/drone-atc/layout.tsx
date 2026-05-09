import { getUserSession } from '@/lib/auth/server-session';
import { getEasaCode } from '@/lib/flytrelay-service';
import { redirect } from 'next/navigation';
import EasaGate from '../../components/drone-atc/EasaGate';

const DRONE_ATC_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'PIC', 'OPM']);

export default async function DroneAtcLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  if (!session) redirect('/auth/login');

  if (DRONE_ATC_ROLES.has(session.user.role)) {
    const easaCode = await getEasaCode(session.user.userId);
    if (!easaCode?.trim()) {
      return <EasaGate />;
    }
  }

  return <>{children}</>;
}
