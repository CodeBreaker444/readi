'use client';

import EvaluationDashboard from "@/components/planning/EvaluationDashboard";
import { useTheme } from "@/components/useTheme";


export default function EvaluationPage() {
  const { isDark } = useTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <EvaluationDashboard isDark={isDark} />
    </div>
  );
}