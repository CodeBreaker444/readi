'use client';

import MissionResultForm from '@/components/mission/MissionResultForm';
import MissionResultSkeleton from '@/components/mission/MissionResultSkeleton';
import MissionResultTable from '@/components/mission/MissionResultTable';
import { useTheme } from '@/components/useTheme';
import { MissionResult } from '@/config/types/types';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MissionResultPage() {
  const { isDark } = useTheme();
  const [results, setResults] = useState<MissionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/result/list`);
      
      const result = response.data;
      if (result.code === 1) {
        setResults(result.data.map((item: any) => ({
          id: item.mission_result_id,
          code: item.mission_result_code,
          description: item.mission_result_desc
        })));
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to fetch mission results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleAddResult = async (newResult: Omit<MissionResult, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/result/add`, {
        mission_result_code: newResult.code,
        mission_result_desc: newResult.description
      });
      
      const result = response.data;
      if (result.code === 1) {
        const addedResult: MissionResult = {
          id: result.data.result_id,
          code: result.data.result_type,
          description: result.data.result_description
        };
        setResults(prev => [...prev, addedResult]);
        toast.success('Mission result added successfully');
        setShowModal(false);
      } else {
        toast.error(result.message || 'Failed to add result');
      }
    } catch (error: any) {
      console.error('Error adding result:', error);
      toast.error(error.response?.data?.message || 'Error adding result');
    }
  };

  const handleDeleteResult = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/result/${id}/delete`);
      
      const result = response.data;
      if (result.code === 1) {
        setResults(prev => prev.filter(result => result.id !== id));
        toast.success('Mission result deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete result');
      }
    } catch (error: any) {
      console.error('Error deleting result:', error);
      toast.error(error.response?.data?.message || 'Error deleting result');
    }
  };

  const handleEditResult = async (updatedResult: MissionResult) => {
    try {
      const response = await axios.post(
        `/api/mission/result/${updatedResult.id}/update`,
        {
          mission_result_code: updatedResult.code,
          mission_result_desc: updatedResult.description
        }
      );
      
      const result = response.data;
      if (result.code === 1) {
        setResults(prev => 
          prev.map(result => 
            result.id === updatedResult.id ? updatedResult : result
          )
        );
        toast.success('Mission result updated successfully');
      } else {
        toast.error(result.message || 'Failed to update result');
      }
    } catch (error: any) {
      console.error('Error updating result:', error);
      toast.error(error.response?.data?.message || 'Error updating result');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-linear-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-white'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-10 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mission Result Management
            </h1>
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Define and maintain mission result types for tracking outcomes
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-1 px-2 sm:px-6 py-2.5 sm:py-3 rounded-md transition-all duration-200 shadow-md hover:shadow-lg ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
            }`}
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add New Result</span>
          </button>
        </div>

        {loading ? (
          <MissionResultSkeleton isDark={isDark} />
        ) : (
          <div className={`overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-4 sm:p-6 lg:p-8">
              <MissionResultTable
                data={results}
                onDelete={handleDeleteResult}
                onEdit={handleEditResult}
                isDark={isDark}
              />
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowModal(false)} />

            <div className={`relative w-full max-w-2xl rounded-xl shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Add New Mission Result
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                </button>
              </div>

              <div className="p-6">
                <MissionResultForm onSubmit={handleAddResult} isDark={isDark} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}