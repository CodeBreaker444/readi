'use client';

import ResultForm from '@/components/mission/ResultForm';
import ResultTable from '@/components/mission/ResultTable';
import { useTheme } from '@/components/useTheme';
import { MissionResult } from '@/config/types';
import { useState } from 'react';

const dummyMissionResults: MissionResult[] = [
  { id: 1, code: 'SUCC', description: 'Success' },
  { id: 2, code: 'FAIL', description: 'Failed' },
  { id: 3, code: 'PART', description: 'Partially Completed' },
  { id: 4, code: 'ABRT', description: 'Aborted' },
  { id: 5, code: 'DEFER', description: 'Deferred' },
];

export default function MissionResultPage() {
  const { isDark } = useTheme()
  const [results, setResults] = useState<MissionResult[]>(dummyMissionResults);

  const handleAddResult = (newResult: Omit<MissionResult, 'id'>) => {
    const newItem: MissionResult = {
      ...newResult,
      id: Math.max(...results.map(r => r.id), 0) + 1,
    };
    setResults([...results, newItem]);
  };

  const handleDeleteResult = (id: number) => {
    setResults(results.filter(result => result.id !== id));
  };

  const handleEditResult = (updatedResult: MissionResult) => {
    setResults(results.map(result =>
      result.id === updatedResult.id ? updatedResult : result
    ));
  };

  return (
  <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
  <div className="mb-6">
    <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
      Mission | Result Management
    </h1>
    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
      Configure mission result codes used to classify completed missions.
    </p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className={`rounded-xl shadow-sm border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <h2 className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          Mission Result List
        </h2>
      </div>
      <div className="p-4">
        <ResultTable
          data={results}
          onDelete={handleDeleteResult}
          onEdit={handleEditResult}
          isDark={isDark}
        />
      </div>
    </div>

    <div className={`rounded-xl shadow-sm border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <h2 className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          Add Mission Result
        </h2>
      </div>
      <div className="p-4">
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Fill the form below to add a new mission result.
        </p>
        <ResultForm onSubmit={handleAddResult} isDark={isDark} />
      </div>
    </div>
  </div>
</div>
  );
}