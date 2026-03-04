"use client";

import PlanningMissionContent from "@/components/planning/PlanningMissionContent";
import { Suspense } from "react";

export default function PlanningMissionPage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <PlanningMissionContent />
    </Suspense>
  );
}