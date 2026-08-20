import { getDashboardData } from "@/backend/services/dashboard/dashboard";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { getUserSession } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getUserSession();

  if (!session) {
    redirect('/api/auth/logout');
  }

  const ownerId = session.user.ownerId!;
  const userProfileCode = session.user.role;
  const userId = session.user.userId;

  let dashboardData = null;
  try {
    dashboardData = await getDashboardData({
      owner_id: ownerId,
      user_id: userId,
      user_timezone: session.user.timezone || 'Europe/Berlin',
      user_profile_code: userProfileCode,
    });
  } catch (err) {
    console.error('[DashboardPage] SSR dashboard fetch failed, falling back to client-side fetch:', err);
  }

  return (
    <DashboardClient 
      ownerId={ownerId}
      userProfileCode={userProfileCode}
      userId={userId}
      initialData={dashboardData} 
    />
  );
}