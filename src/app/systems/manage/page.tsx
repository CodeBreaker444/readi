import { getUserSession } from '@/lib/auth/server-session';
import { redirect } from 'next/navigation';
import DroneToolPage from './DroneToolPage';

export default async function Page() {
  const session = await getUserSession();
  if (!session) redirect('/auth/login');

  return <DroneToolPage dFlightEnabled={session.user.dFlightEnabled} />;
}
