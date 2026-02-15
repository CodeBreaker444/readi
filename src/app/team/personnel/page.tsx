import UserManagement from "@/components/superadmin/UserManagement";
import { getUserSession } from "@/lib/auth/server-session";

export default async function TeamPersonnelPage() {
  const session = await getUserSession();
  return <UserManagement session={session!} />;
}