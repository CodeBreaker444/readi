import DashboardClient from '@/src/components/dashboard/DashboardClient';
import { getUserSession } from '@/src/lib/auth/server-session';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getUserSession();
  
  if (!session) {
    redirect('/auth/login');
  }

  const ownerId = session.user.ownerId!;
  const userProfileCode = session.user.role;
  const userId = session.user.userId;

  return (
    <DashboardClient 
      ownerId={ownerId}
      userProfileCode={userProfileCode}
      userId={userId}
    />
  );
}