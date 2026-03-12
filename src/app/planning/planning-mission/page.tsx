
import { PlanningMissionContent } from "@/components/planning/PlanningMissionContent";
import { PlanningMissionSkeleton } from "@/components/planning/PlanningMissionSkeleton";
import { getUserSession } from "@/lib/auth/server-session";
import { Suspense } from "react";

export default async function PlanningMissionPage() {
  const session = await getUserSession()
  return (
    <Suspense
      fallback={<PlanningMissionSkeleton />}
    >
      <PlanningMissionContent  user={session?.user!}/>
    </Suspense>
  );
}