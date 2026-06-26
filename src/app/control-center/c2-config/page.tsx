import C2Config from '@/components/control-center/C2Config';
import { getUserSession } from '@/lib/auth/server-session';
import { redirect } from 'next/navigation';

export default async function C2ConfigPage() {
  const session = await getUserSession();
  if (!session) redirect('/auth/login');
  return <C2Config />;
}
