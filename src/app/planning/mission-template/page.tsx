'use client';

import MissionTemplateDashboard from "@/components/planning/MissionTemplateDashboard";
import { useTheme } from "@/components/useTheme";


export default function MissionTemplatesPage() {
  const { isDark } = useTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <MissionTemplateDashboard isDark={isDark} />
    </div>
  );
}