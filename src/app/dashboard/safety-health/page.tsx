import SHIIndex from "@/components/dashboard/SHIIndex";
import { getUserSession } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getUserSession();
  if (!session) redirect('/api/auth/logout');
  return <SHIIndex user={session.user} />;
}