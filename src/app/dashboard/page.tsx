import DashboardClient from "@/components/dashboard/DashboardClient";
import { getUserSession } from "@/lib/auth/server-session";

export default async function DashboardPage() {
  const session = await getUserSession();
  
  if (!session) {
    console.log('session',session);
    return
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