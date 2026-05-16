import ClientProfilePage from "@/components/profile/ClientProfilePage";
import ProfilePage from "@/components/profile/ProfilePage";
import { getUserSession } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getUserSession();
  if (!session) {
    redirect('/api/auth/logout');
  }

  if (session.user.role === 'CLIENT') {
    return <ClientProfilePage user={session.user} />;
  }

  return <ProfilePage user={session.user} />;
}