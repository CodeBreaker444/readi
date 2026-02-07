'use client';

import MissionPlanningFilters from '@/src/components/logbook/MissionPlanningFilters';
import MissionPlanningTable from '@/src/components/logbook/MissionPlanningTable';
import { useSession } from '@/src/lib/useSession';
import { FileText } from 'lucide-react';
import { useState } from 'react';

export default function MissionPlanningLogbookPage() {
  const { ownerId, isLoading } = useSession();
  const [filters, setFilters] = useState({
    clientId: 0,
    pilotId: 0,
    evaluationId: 0,
    planningId: 0,
    dateStart: '',
    dateEnd: '',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white dark:bg-blue-900 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Mission Planning Logbook
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track and manage mission planning templates
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MissionPlanningFilters
            ownerId={ownerId}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-6">
          <MissionPlanningTable ownerId={ownerId} filters={filters} />
        </div>
      </div>
    </div>
  );
}