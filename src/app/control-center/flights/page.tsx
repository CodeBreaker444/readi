import { getUserSession } from '@/lib/auth/server-session';
import { FlightsTabs } from '@/components/control-center/FlightsTabs';

export default async function FlightsPage() {
  const session = await getUserSession();

  return (
    <FlightsTabs flytrelayAccess={session?.user.flytrelayAccess ?? false} />
  );
}
