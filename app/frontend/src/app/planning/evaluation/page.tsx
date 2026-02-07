'use client';

import EvaluationDashboard from "@/src/components/planning/EvaluationDashboard";
import { useTheme } from "@/src/components/useTheme";

export default function EvaluationPage() {
  const { isDark } = useTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <EvaluationDashboard isDark={isDark} />
    </div>
  );
}