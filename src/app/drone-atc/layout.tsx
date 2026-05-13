import { getUserSession } from '@/lib/auth/server-session';
import { getEasaCode } from '@/lib/flytrelay-service';
import { redirect } from 'next/navigation';
import { TbRadarOff } from 'react-icons/tb';
import EasaGate from '../../components/drone-atc/EasaGate';

const DRONE_ATC_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'PIC', 'OPM']);

export default async function DroneAtcLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();
  if (!session) redirect('/auth/login');

  if (!session.user.droneAtcEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <TbRadarOff className="w-16 h-16 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold">Drone ATC Not Enabled</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Drone ATC has not been enabled for your organization. Please contact your administrator.
        </p>
      </div>
    );
  }

  if (DRONE_ATC_ROLES.has(session.user.role)) {
    const easaCode = await getEasaCode(session.user.userId);
    if (!easaCode?.trim()) {
      return <EasaGate />;
    }
  }

  return <>{children}</>;
}
