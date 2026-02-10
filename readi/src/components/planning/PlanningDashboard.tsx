'use client';
import { data } from '@/lib/mockdata';
import React, { useEffect, useState } from 'react';
import AddPlanningForm from './AddPlanningForm';
import CollapsibleForm from './CollapsibleForm';
import DataTable from './DataTable';

interface PlanningDashboardProps {
  isDark?: boolean;
}

const PlanningDashboard: React.FC<PlanningDashboardProps> = ({ isDark = false }) => {
  const [plannings, setPlannings] = useState<any[]>([]);
  const [selectedPlannings, setSelectedPlannings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlannings();
  }, []);

  const loadPlannings = async () => {
    // try {
    //   const response = await fetch('/api/planning/list');
    //   const data = await response.json();
      setPlannings(data.plannings);
    // } catch (error) {
    //   console.error('Error loading plannings:', error);
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleAddPlanning = async (formData: any) => {
    try {
      const response = await fetch('/api/planning/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Planning added successfully!');
        loadPlannings();
      } else {
        alert('Error adding planning');
      }
    } catch (error) {
      console.error('Error adding planning:', error);
      alert('Error adding planning');
    }
  };

  const handleRowSelect = (selectedRows: any[]) => {
    setSelectedPlannings(selectedRows);
  };

  const columns = [
    { title: 'Code', data: 'planning_code' },
    { title: 'Evaluation', data: 'evaluation_code' },
    { title: 'Description', data: 'planning_desc' },
    { title: 'Type', data: 'planning_type' },
    { title: 'Status', data: 'planning_status' },
    { title: 'Request Date', data: 'planning_request_date' },
    { title: 'Year', data: 'planning_year' },
    { title: 'Version', data: 'planning_ver' },
    { 
      title: 'Result', 
      data: 'planning_result',
      render: (data: string) => {
        const colorMap: Record<string, string> = {
          'PROGRESS': 'bg-blue-100 text-blue-800',
          'COMPLETED': 'bg-green-100 text-green-800',
          'REJECTED': 'bg-red-100 text-red-800'
        };
        return `<span class="px-2 py-1 rounded text-xs ${colorMap[data] || 'bg-gray-100 text-gray-800'}">${data}</span>`;
      }
    }
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Planning | Planning Dashboard
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage operational planning requests
          </p>
        </div>

        {/* Add Planning Form */}
        <div className="mb-6">
          <CollapsibleForm
            title="[GO.00.P01] Add Planning Request"
            subtitle="Fill the form for adding a new planning."
            defaultOpen={false}
            isDark={isDark}
          >
            <AddPlanningForm 
              onSubmit={handleAddPlanning}
              isDark={isDark}
            />
          </CollapsibleForm>
        </div>

        {/* Plannings Table */}
        <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border`}>
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Planning - Operational Scenario Request Logbook
                </h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Register of Operational Scenario Requests
                </p>
              </div>

              {selectedPlannings.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedPlannings.length} selected
                  </span>
                  <div className="relative">
                    <button
                      className={`px-3 py-1 border rounded-lg text-sm ${
                        isDark 
                          ? 'border-slate-600 text-gray-300 hover:bg-slate-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Actions ▼
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className={`ml-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading plannings...
                </span>
              </div>
            ) : (
              <DataTable
                id="planningTableData"
                columns={columns}
                data={plannings}
                onRowSelect={handleRowSelect}
                isDark={isDark}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningDashboard;