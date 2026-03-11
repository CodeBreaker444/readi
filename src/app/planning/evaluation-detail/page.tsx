import { EvaluationDetailContent } from "@/components/planning/evaluation/EvaluationDetailContent";
import { EvaluationDetailSkeleton } from "@/components/planning/evaluation/EvaluationSkeleton";
import { getUserSession } from "@/lib/auth/server-session";
import { Suspense } from "react";

export default async function EvaluationDetailPage() {
  const session = await getUserSession()
  return (
    <Suspense
      fallback={<EvaluationDetailSkeleton /> }
    >
      <EvaluationDetailContent ownerId={session?.user.ownerId!}/>
    </Suspense>
  );
}