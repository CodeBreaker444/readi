'use client';

import PlanningDashboard from "@/components/planning/PlanningDashboard";
import { useTheme } from "@/components/useTheme";
import { canDelete, canEdit } from "@/lib/auth/roles";
import { useEffect, useState } from "react";
import { getUserSession } from "@/lib/auth/server-session";


export default function PlanningMissionPage() {
  const { isDark } = useTheme();
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [userCanDelete, setUserCanDelete] = useState(false);

  useEffect(() => {
    async function loadUserPermissions() {
      try {
        const session = await getUserSession();
        if (session?.user) {
          setUserCanEdit(canEdit(session.user.isViewer));
          setUserCanDelete(canDelete(session.user.isViewer, session.user.isManager));
        }
      } catch (error) {
        console.error("Failed to load user permissions:", error);
      }
    }
    loadUserPermissions();
  }, []);

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <PlanningDashboard isDark={isDark} userCanEdit={userCanEdit} userCanDelete={userCanDelete} />
    </div>
  );
}