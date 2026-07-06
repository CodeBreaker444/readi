'use client';

import PlanningDashboard from "@/components/planning/PlanningDashboard";
import { usePermissions } from "@/components/permissions/PermissionsProvider";
import { useTheme } from "@/components/useTheme";

export default function PlanningMissionPage() {
  const { isDark } = useTheme();
  const { canEdit, canDelete } = usePermissions();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <PlanningDashboard isDark={isDark} userCanEdit={canEdit('planning_dashboard')} userCanDelete={canDelete('planning_dashboard')} />
    </div>
  );
}