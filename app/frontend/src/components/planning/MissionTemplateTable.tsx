'use client';
import React from 'react';
import DataTable from './DataTable';

interface MissionTemplate {
  id: number;
  template_code: string;
  client_name: string;
  pilot_name: string;
  evaluation_code: string;
  planning_code: string;
  mission_type: string;
  last_update: string;
  status: string;
}

interface MissionTemplateTableProps {
  data: MissionTemplate[];
  isDark?: boolean;
}

const MissionTemplateTable: React.FC<MissionTemplateTableProps> = ({ data, isDark = false }) => {
  const columns = [
    { title: 'Template Code', data: 'template_code' },
    { title: 'Client', data: 'client_name' },
    { title: 'PiC', data: 'pilot_name' },
    { title: 'Evaluation', data: 'evaluation_code' },
    { title: 'Planning', data: 'planning_code' },
    { title: 'Mission Type', data: 'mission_type' },
    { title: 'Last Update', data: 'last_update' },
    { title: 'Status', data: 'status' }
  ];

  return (
    <div className={`rounded-lg shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'} p-4`}>
      <DataTable
        id="missionPlanningTemplateTableData"
        columns={columns}
        data={data}
        isDark={isDark}
      />
    </div>
  );
};

export default MissionTemplateTable;