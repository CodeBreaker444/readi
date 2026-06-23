import { getFlytbaseCredentials, getFlytbaseCredentialsForCompany } from '@/backend/services/integrations/flytbase-service';
import { getUserSession } from '@/lib/auth/server-session';
import { FlytbaseFlights } from '@/components/control-center/FlytbaseFlights';
import { FlytrelayFlights } from '@/components/control-center/FlytrelayFlights';
import { FlightsTabs } from '@/components/control-center/FlightsTabs';

export default async function FlightsPage() {
  const session = await getUserSession();
  const creds = session
    ? (await getFlytbaseCredentials(session.user.userId)) ??
      (await getFlytbaseCredentialsForCompany(session.user.ownerId, session.user.userId))
    : null;

  return (
    <FlightsTabs flytbaseToken={creds?.token ?? null} />
  );
}
