'use client';

import PlanningDashboard from "@/components/planning/PlanningDashboard";
import { useTheme } from "@/components/useTheme";


export default function PlanningMissionPage() {
  const { isDark } = useTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <PlanningDashboard isDark={isDark} />
    </div>
  );
}