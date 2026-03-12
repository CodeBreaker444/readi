import SHIIndex from "@/components/dashboard/SHIIndex";
import { getUserSession } from "@/lib/auth/server-session";

export default async function Page() {
  const session = await getUserSession();
  if (!session) return null;
  return <SHIIndex user={session.user} />;
}