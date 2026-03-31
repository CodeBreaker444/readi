import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { getUserSession } from '@/lib/auth/server-session';
import { FlytbaseFlights } from '../../../components/flytbase/FlytbaseFlights';

export default async function FlytbaseFlightsPage() {
  const session = await getUserSession();
  const creds = session ? await getFlytbaseCredentials(session.user.userId) : null;

  return <FlytbaseFlights token={creds?.token ?? null} />;
}
