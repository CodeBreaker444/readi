'use client';

import StatusForm from '@/src/components/mission/StatusForm';
import StatusTable from '@/src/components/mission/StatusTable';
import { MissionStatus } from '@/src/config/types';
import { useState } from 'react';

const dummyMissionStatuses: MissionStatus[] = [
  { id: 1, code: 'PEND', description: 'Pending' },
  { id: 2, code: 'APPR', description: 'Approved' },
  { id: 3, code: 'PROG', description: 'In Progress' },
  { id: 4, code: 'COMP', description: 'Completed' },
  { id: 5, code: 'CANC', description: 'Cancelled' },
  { id: 6, code: 'HOLD', description: 'On Hold' },
];

export default function MissionStatusPage() {
  const [statuses, setStatuses] = useState<MissionStatus[]>(dummyMissionStatuses);

  const handleAddStatus = (newStatus: Omit<MissionStatus, 'id'>) => {
    const newItem: MissionStatus = {
      ...newStatus,
      id: Math.max(...statuses.map(s => s.id), 0) + 1,
    };
    setStatuses([...statuses, newItem]);
  };

  const handleDeleteStatus = (id: number) => {
    setStatuses(statuses.filter(status => status.id !== id));
  };

  const handleEditStatus = (updatedStatus: MissionStatus) => {
    setStatuses(statuses.map(status =>
      status.id === updatedStatus.id ? updatedStatus : status
    ));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Mission | Status Management
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Define mission statuses used across the operational workflow.
        </p>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Mission Status List
            </h2>
          </div>
          <div className="p-4">
            <StatusTable
              data={statuses}
              onDelete={handleDeleteStatus}
              onEdit={handleEditStatus}
            />
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Add Mission Status
            </h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Fill the form below to add a new mission status.
            </p>
            <StatusForm onSubmit={handleAddStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}