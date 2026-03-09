import { EvaluationDetailContent } from "@/components/planning/evaluation/EvaluationDetailContent";
import { EvaluationDetailSkeleton } from "@/components/planning/evaluation/EvaluationSkeleton";
import { Suspense } from "react";

export default function EvaluationDetailPage() {
  return (
    <Suspense
      fallback={<EvaluationDetailSkeleton /> }
    >
      <EvaluationDetailContent />
    </Suspense>
  );
}