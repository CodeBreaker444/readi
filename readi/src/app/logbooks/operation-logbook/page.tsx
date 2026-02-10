'use client';

import FlightLogbookFilters from '@/components/logbook/FlightLogbookFilters';
import FlightLogbookOffcanvas from '@/components/logbook/FlightLogbookOffcanvas';
import FlightLogbookTable from '@/components/logbook/FlightLogbookTable';
import { getUserSession } from '@/lib/auth/server-session';
import { Plane } from 'lucide-react';
import { useState } from 'react';

export default async function OperationLogbookPage() {
  const session = await getUserSession();
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    pilotId: 0,
    missionPlan: 0,
    missionTypeId: 0,
    missionCategoryId: 0,
    droneSystemId: 0,
    missionResultId: 0,
    missionStatusId: 0,
    clientId: 0,
  });
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);

  const handleRowClick = (mission: any) => {
    setSelectedMission(mission);
    setIsOffcanvasOpen(true);
  };
 

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Plane className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Flight Logbook
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Comprehensive flight operations and mission records
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FlightLogbookFilters
            ownerId={session?.user.ownerId!}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="p-6">
          <FlightLogbookTable
            ownerId={session?.user.ownerId!}
            filters={filters}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      <FlightLogbookOffcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => setIsOffcanvasOpen(false)}
        missionData={selectedMission}
      />
    </div>
  );
}