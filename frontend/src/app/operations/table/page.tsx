'use client';

import OperationDashboard from "@/src/components/operation/OperationDashboard";
import { useTheme } from "@/src/components/useTheme";

export default function OperationsTablePage() {
  const { isDark } = useTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          Operation Dashboard
        </h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage and monitor mission operations
        </p>
      </div>
      <OperationDashboard isDark={isDark} />
    </div>
  );
}