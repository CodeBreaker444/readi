'use client';

import EvaluationDashboard from "@/components/planning/EvaluationDashboard";
import { useTheme } from "@/components/useTheme";


export default function EvaluationPage() {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-900'}`}>
      <EvaluationDashboard isDark={isDark} />
    </div>
  );
}