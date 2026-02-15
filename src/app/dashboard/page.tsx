import { getDashboardData } from '@/backend/services/dashboard/dashboard';
import DashboardClient from "@/components/dashboard/DashboardClient";
import { getUserSession } from "@/lib/auth/server-session";

export default async function DashboardPage() {
  const session = await getUserSession();
  
  if (!session) {
    return null;
  }

  const ownerId = session.user.ownerId!;
  const userProfileCode = session.user.role;
  const userId = session.user.userId;

  const dashboardData = await getDashboardData({
    owner_id: ownerId,
    user_id: userId,
    user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    user_profile_code: userProfileCode,
  });

  return (
    <DashboardClient 
      ownerId={ownerId}
      userProfileCode={userProfileCode}
      userId={userId}
      initialData={dashboardData} 
    />
  );
}