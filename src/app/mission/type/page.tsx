'use client';

import MissionTypeForm from '@/components/mission/MissionTypeForm';
import MissionTypeTable from '@/components/mission/MissionTypeTable';
import { useTheme } from '@/components/useTheme';
import { MissionType } from '@/config/types';
import { useState } from 'react';

const dummyMissionTypes: MissionType[] = [
  { id: 1, description: 'Surveillance', code: 'SURV', label: 'Surveillance Mission' },
  { id: 2, description: 'Inspection', code: 'INSP', label: 'Infrastructure Inspection' },
  { id: 3, description: 'Mapping', code: 'MAP', label: 'Aerial Mapping' },
  { id: 4, description: 'Delivery', code: 'DELV', label: 'Package Delivery' },
  { id: 5, description: 'Emergency', code: 'EMER', label: 'Emergency Response' },
];

export default function MissionTypePage() {
  const { isDark } = useTheme()
  const [missionTypes, setMissionTypes] = useState<MissionType[]>(dummyMissionTypes);

  const handleAddMissionType = (newType: Omit<MissionType, 'id'>) => {
    const newMissionType: MissionType = {
      ...newType,
      id: Math.max(...missionTypes.map(t => t.id), 0) + 1,
    };
    setMissionTypes([...missionTypes, newMissionType]);
  };

  const handleDeleteMissionType = (id: number) => {
    setMissionTypes(missionTypes.filter(type => type.id !== id));
  };

  const handleEditMissionType = (updatedType: MissionType) => {
    setMissionTypes(missionTypes.map(type => 
      type.id === updatedType.id ? updatedType : type
    ));
  };

  return (
    <div
  className={`min-h-screen p-6 ${
    isDark
      ? 'bg-linear-to-br from-gray-900 to-gray-800'
      : 'bg-linear-to-br from-gray-50 to-gray-100'
  }`}
>
  <div className="max-w-7xl mx-auto">
    <div className="mb-8">
      <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
        Mission Types Management
      </h1>
      <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Manage and configure mission types for your operations
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <div
        className={`rounded-2xl shadow-lg border overflow-hidden transition-shadow duration-300 hover:shadow-xl ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className="bg-linear-to-r from-blue-500 to-blue-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Mission Type List</h2>
          <p className="text-blue-100 text-sm mt-1">View and manage existing types</p>
        </div>
        <div className="p-6">
          <MissionTypeTable
            data={missionTypes}
            onDelete={handleDeleteMissionType}
            onEdit={handleEditMissionType}
            isDark={isDark}
          />
        </div>
      </div>

      <div
        className={`rounded-2xl shadow-lg border overflow-hidden transition-shadow duration-300 hover:shadow-xl ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className="bg-linear-to-r from-green-500 to-green-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Add New Mission Type</h2>
          <p className="text-green-100 text-sm mt-1">Create a new mission type entry</p>
        </div>
        <div className="p-6">
          <MissionTypeForm onSubmit={handleAddMissionType} isDark={isDark} />
        </div>
      </div>

    </div>
  </div>
</div>

  );
}