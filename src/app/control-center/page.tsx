import ControlCenterPage from "@/components/control-center/ControlCenterPage";
import { getUserSession } from "@/lib/auth/server-session";
import { redirect } from "next/navigation";


export default async function Page() {
  const session = await getUserSession();
  if (!session) {
    redirect('/api/auth/logout');
  }
  return (
    <ControlCenterPage user={session?.user} />
  )
}
