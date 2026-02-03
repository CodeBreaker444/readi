'use client';
import React, { useEffect, useState } from 'react';
import AddEvaluationForm from './AddEvaluationForm';
import CollapsibleForm from './CollapsibleForm';
import DataTable from './DataTable';

interface EvaluationDashboardProps {
  isDark?: boolean;
}

const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({ isDark = false }) => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [selectedEvaluations, setSelectedEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      const response = await fetch('/api/evaluations/list');
      const data = await response.json();
      setEvaluations(data);
    } catch (error) {
      console.error('Error loading evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvaluation = async (formData: any) => {
    try {
      const response = await fetch('/api/evaluations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Evaluation added successfully!');
        loadEvaluations();
      } else {
        alert('Error adding evaluation');
      }
    } catch (error) {
      console.error('Error adding evaluation:', error);
      alert('Error adding evaluation');
    }
  };

  const handleRowSelect = (selectedRows: any[]) => {
    setSelectedEvaluations(selectedRows);
  };

  const columns = [
    { title: 'Code', data: 'evaluation_code' },
    { title: 'Client', data: 'client_name' },
    { title: 'Description', data: 'evaluation_desc' },
    { title: 'Status', data: 'evaluation_status' },
    { title: 'Request Date', data: 'evaluation_request_date' },
    { title: 'Year', data: 'evaluation_year' },
    { 
      title: 'Result', 
      data: 'evaluation_result',
      render: (data: string) => {
        const colorMap: Record<string, string> = {
          'PROCESSING': 'bg-blue-100 text-blue-800',
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
            Planning | Evaluation Dashboard
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage operational scenario evaluation requests
          </p>
        </div>

        {/* Add Evaluation Form */}
        <div className="mb-6">
          <CollapsibleForm
            title="[GO.00.P01] Add Evaluation Request"
            subtitle="Fill the form for adding a new evaluation request."
            defaultOpen={false}
            isDark={isDark}
          >
            <AddEvaluationForm 
              onSubmit={handleAddEvaluation}
              isDark={isDark}
            />
          </CollapsibleForm>
        </div>

        {/* Evaluations Table */}
        <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border`}>
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Evaluation - Operational Scenario Request Logbook
                </h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Operational Scenarios Request Log
                </p>
              </div>

              {selectedEvaluations.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedEvaluations.length} selected
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
                  Loading evaluations...
                </span>
              </div>
            ) : (
              <DataTable
                id="evaluationTableData"
                columns={columns}
                data={evaluations}
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

export default EvaluationDashboard;