import SHIIndex from "@/components/dashboard/SHIIndex";
import { getUserSession } from "@/lib/auth/server-session";

export default async function Page() {
  const session =await getUserSession()
  return <SHIIndex  user={session?.user!}/>;
}