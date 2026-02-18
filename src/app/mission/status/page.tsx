'use client';

import MissionStatusForm from '@/components/mission/MissionStatusForm';
import MissionStatusTable from '@/components/mission/MissionStatusTable';
import MissionStatusSkeleton from '@/components/mission/StatusSkeleton';
import { useTheme } from '@/components/useTheme';
import { Mission } from '@/config/types/types';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MissionStatusPage() {
  const { isDark } = useTheme();
  const [statuses, setStatuses] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/status/list`);

      const result = response.data;
      if (result.code === 1) {
        setStatuses(result.data.map((item: any) => ({
          id: item.mission_status_id,
          code: item.mission_status_code,
          name: item.mission_status_name,
          description: item.mission_status_desc,
          order: item.status_order,
          isFinalStatus: item.is_final_status
        })));
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast.error('Failed to fetch mission statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleAddStatus = async (newStatus: Omit<Mission, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/status/add`, {
        mission_status_code: newStatus.code,
        mission_status_name: newStatus.name,
        mission_status_desc: newStatus.description,
        status_order: newStatus.order,
        is_final_status: newStatus.isFinalStatus
      });

      const result = response.data;
      if (result.code === 1) {
        const addedStatus: Mission = {
          id: result.data.status_id,
          code: result.data.status_code,
          name: result.data.status_name,
          description: result.data.status_description,
          order: result.data.status_order,
          isFinalStatus: result.data.is_final_status
        };
        setStatuses(prev => [...prev, addedStatus].sort((a, b) => (a.order || 0) - (b.order || 0)));
        toast.success('Mission status added successfully');
        setShowModal(false);
      } else {
        toast.error(result.message || 'Failed to add status');
      }
    } catch (error: any) {
      console.error('Error adding status:', error);
      toast.error(error.response?.data?.message || 'Error adding status');
    }
  };

  const handleDeleteStatus = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/status/${id}/delete`);

      const result = response.data;
      if (result.code === 1) {
        setStatuses(prev => prev.filter(status => status.id !== id));
        toast.success('Mission status deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete status');
      }
    } catch (error: any) {
      console.error('Error deleting status:', error);
      toast.error(error.response?.data?.message || 'Error deleting status');
    }
  };

  const handleEditStatus = async (updatedStatus: Mission) => {
    try {
      const response = await axios.post(
        `/api/mission/status/${updatedStatus.id}/update`,
        {
          mission_status_code: updatedStatus.code,
          mission_status_name: updatedStatus.name,
          mission_status_desc: updatedStatus.description,
          status_order: updatedStatus.order,
          is_final_status: updatedStatus.isFinalStatus
        }
      );

      const result = response.data;
      if (result.code === 1) {
        setStatuses(prev =>
          prev.map(status =>
            status.id === updatedStatus.id ? updatedStatus : status
          ).sort((a, b) => (a.order || 0) - (b.order || 0))
        );
        toast.success('Mission status updated successfully');
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Error updating status');
    }
  };

 

  return (
    <div className={`min-h-screen ${isDark ? 'bg-linear-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-white'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-10 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mission Status Management
            </h1>
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Define and maintain mission statuses for tracking flight operations
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-1 px-2 sm:px-6 py-2.5 sm:py-3 rounded-md transition-all duration-200 shadow-md hover:shadow-lg ${isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }`}
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add New Status</span>
          </button>
        </div>

        {loading ? (
          <MissionStatusSkeleton isDark={isDark} />
        ) : (
          <div className={`overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-4 sm:p-6 lg:p-8">
              <MissionStatusTable
                data={statuses}
                onDelete={handleDeleteStatus}
                onEdit={handleEditStatus}
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
                  Add New Mission Status
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                </button>
              </div>

              <div className="p-6">
                <MissionStatusForm onSubmit={handleAddStatus} isDark={isDark} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}