import UserManagement from "@/components/user/UserManagement";
import { getUserSession } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";

export default async function TeamPersonnelPage() {
  const session = await getUserSession();
  if (!session) redirect('/auth/login');
  return <UserManagement session={session} />;
}