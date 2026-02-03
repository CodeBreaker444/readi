'use client';
import React, { useState } from 'react';
import OperationActionButtons from './OperationActionButtons';
import OperationFilters from './OperationFilters';
import OperationTable from './OperationTable';

// Dummy data
const dummyData = {
  pilots: [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
    { id: 3, name: 'Bob Johnson' }
  ],
  missionPlans: [
    { id: 1, name: 'PLAN-2026-0001' },
    { id: 2, name: 'PLAN-2026-0002' },
    { id: 3, name: 'PLAN-2026-0003' }
  ],
  missionTypes: [
    { id: 1, name: 'Survey' },
    { id: 2, name: 'Mapping' },
    { id: 3, name: 'Inspection' }
  ],
  missionCategories: [
    { id: 1, name: 'Commercial' },
    { id: 2, name: 'Research' },
    { id: 3, name: 'Emergency' }
  ],
  droneSystems: [
    { id: 1, name: 'DJI Phantom 4' },
    { id: 2, name: 'DJI Mavic 3' },
    { id: 3, name: 'Custom Drone' }
  ],
  missionResults: [
    { id: 1, name: 'Success' },
    { id: 2, name: 'Partial' },
    { id: 3, name: 'Failed' }
  ],
  missionStatuses: [
    { id: 1, name: 'Scheduled' },
    { id: 2, name: 'In Progress' },
    { id: 3, name: 'Completed' }
  ],
  clients: [
    { id: 1, name: 'Acme Corporation' },
    { id: 2, name: 'Tech Solutions Inc.' },
    { id: 3, name: 'Global Logistics Ltd.' }
  ],
  missions: [
    {
      id: 1,
      mission_code: 'MIS-2026-0001',
      mission_date: '2026-01-20',
      client_name: 'Acme Corporation',
      pilot_name: 'John Doe',
      mission_type: 'Survey',
      mission_category: 'Commercial',
      drone_system: 'DJI Phantom 4',
      mission_status: 'Scheduled',
      mission_result: '-'
    },
    {
      id: 2,
      mission_code: 'MIS-2026-0002',
      mission_date: '2026-01-21',
      client_name: 'Tech Solutions Inc.',
      pilot_name: 'Jane Smith',
      mission_type: 'Mapping',
      mission_category: 'Research',
      drone_system: 'DJI Mavic 3',
      mission_status: 'In Progress',
      mission_result: '-'
    },
    {
      id: 3,
      mission_code: 'MIS-2026-0003',
      mission_date: '2026-01-22',
      client_name: 'Global Logistics Ltd.',
      pilot_name: 'Bob Johnson',
      mission_type: 'Inspection',
      mission_category: 'Commercial',
      drone_system: 'Custom Drone',
      mission_status: 'Completed',
      mission_result: 'Success'
    }
  ]
};

interface OperationDashboardProps {
  isDark?: boolean;
}

const OperationDashboard: React.FC<OperationDashboardProps> = ({ isDark = false }) => {
  const [filters, setFilters] = useState({
    pilot: 0,
    missionPlan: 0,
    missionType: 0,
    missionCategory: 0,
    droneSystem: 0,
    missionResult: 0,
    missionStatus: 0,
    client: 0,
    dateStart: '',
    dateEnd: ''
  });
  const [missions, setMissions] = useState(dummyData.missions);
  const [selectedMissions, setSelectedMissions] = useState<any[]>([]);

  const handleFilterChange = (filterType: string, value: number) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setFilters(prev => ({
      ...prev,
      dateStart: start || prev.dateStart,
      dateEnd: end || prev.dateEnd
    }));
  };

  const handleSearch = () => {
    // Filter logic here
    let filtered = dummyData.missions;
    
    if (filters.pilot > 0) {
      filtered = filtered.filter(m => m.id === filters.pilot);
    }
    if (filters.client > 0) {
      filtered = filtered.filter(m => m.id === filters.client);
    }
    
    setMissions(filtered);
  };

  const handleAddMission = () => {
    console.log('Add new mission');
  };

  const handleImportMission = () => {
    console.log('Import mission');
  };

  const handleAddCommunication = () => {
    console.log('Add general communication');
  };

  return (
    <div className={`p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'} min-h-screen`}>

      <OperationActionButtons
        onAddMission={handleAddMission}
        onImportMission={handleImportMission}
        onAddCommunication={handleAddCommunication}
        isDark={isDark}
      />

      <OperationFilters
        pilots={dummyData.pilots}
        missionPlans={dummyData.missionPlans}
        missionTypes={dummyData.missionTypes}
        missionCategories={dummyData.missionCategories}
        droneSystems={dummyData.droneSystems}
        missionResults={dummyData.missionResults}
        missionStatuses={dummyData.missionStatuses}
        clients={dummyData.clients}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onSearch={handleSearch}
        isDark={isDark}
      />

      <OperationTable
        data={missions}
        onRowSelect={setSelectedMissions}
        isDark={isDark}
      />
    </div>
  );
};

export default OperationDashboard;