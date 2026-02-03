'use client';
import React, { useState } from 'react';
import DataTable from '../planning/DataTable';

interface Mission {
  id: number;
  mission_code: string;
  mission_date: string;
  client_name: string;
  pilot_name: string;
  mission_type: string;
  mission_category: string;
  drone_system: string;
  mission_status: string;
  mission_result: string;
}

interface OperationTableProps {
  data: Mission[];
  onRowSelect?: (selectedRows: Mission[]) => void;
  isDark?: boolean;
}

const OperationTable: React.FC<OperationTableProps> = ({ data, onRowSelect, isDark = false }) => {
  const [selectedRows, setSelectedRows] = useState<Mission[]>([]);

  const columns = [
    { title: 'Mission Code', data: 'mission_code' },
    { title: 'Date', data: 'mission_date' },
    { title: 'Client', data: 'client_name' },
    { title: 'PiC', data: 'pilot_name' },
    { title: 'Type', data: 'mission_type' },
    { title: 'Category', data: 'mission_category' },
    { title: 'Drone System', data: 'drone_system' },
    { title: 'Status', data: 'mission_status' },
    { title: 'Result', data: 'mission_result' }
  ];

  const handleRowSelect = (rows: any[]) => {
    setSelectedRows(rows);
    if (onRowSelect) {
      onRowSelect(rows);
    }
  };

  return (
    <div className={`rounded-lg shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'} p-4`}>
      {selectedRows.length > 0 && (
        <div className={`mb-4 p-3 rounded-md ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <div className="flex items-center gap-2">
            <button className={`px-4 py-2 rounded-md text-sm font-medium ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              Multiple Action
            </button>
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {selectedRows.length} mission(s) selected
            </span>
          </div>
        </div>
      )}
      <DataTable
        id="missionTableData"
        columns={columns}
        data={data}
        onRowSelect={handleRowSelect}
        isDark={isDark}
      />
    </div>
  );
};

export default OperationTable;