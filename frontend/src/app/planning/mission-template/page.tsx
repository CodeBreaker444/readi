'use client';

import MissionTemplateDashboard from "@/src/components/planning/MissionTemplateDashboard";
import { useTheme } from "@/src/components/ThemeContext";

export default function MissionTemplatesPage() {
  const { isDark } = useTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          Mission Planning Logbook
        </h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage and filter mission planning templates
        </p>
      </div>
      <MissionTemplateDashboard isDark={isDark} />
    </div>
  );
}