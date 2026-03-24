import ClientManagement from "@/components/team/ClientManagement";
import { getUserSession } from "@/lib/auth/server-session";

export default async function ClientManagementPage() {
  const session = await getUserSession();
  return <ClientManagement session={session!} />;
}