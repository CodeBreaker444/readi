'use client';

import PlanningDashboard from "@/src/components/planning/PlanningDashboard";
import { useTheme } from "@/src/components/ThemeContext";

export default function PlanningMissionPage() {
  const { isDark } = useTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <PlanningDashboard isDark={isDark} />
    </div>
  );
}