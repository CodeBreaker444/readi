'use client';

import MissionStatusForm from '@/components/mission/MissionStatusForm';
import MissionStatusTable from '@/components/mission/MissionStatusTable';
import MissionStatusSkeleton from '@/components/mission/StatusSkeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { Mission } from '@/config/types/types';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MissionStatusPage() {
  const { isDark } = useTheme();
  const [statuses, setStatuses] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          isFinalStatus: item.is_final_status,
        })));
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast.error('Failed to fetch mission statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatuses(); }, []);

  const handleAddStatus = async (newStatus: Omit<Mission, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/status/add`, {
        mission_status_code: newStatus.code,
        mission_status_name: newStatus.name,
        mission_status_desc: newStatus.description,
        status_order: newStatus.order,
        is_final_status: newStatus.isFinalStatus,
      });
      const result = response.data;
      if (result.code === 1) {
        const added: Mission = {
          id: result.data.status_id,
          code: result.data.status_code,
          name: result.data.status_name,
          description: result.data.status_description,
          order: result.data.status_order,
          isFinalStatus: result.data.is_final_status,
        };
        setStatuses(prev => [...prev, added].sort((a, b) => (a.order || 0) - (b.order || 0)));
        toast.success('Mission status added successfully');
        setIsDialogOpen(false);
      } else {
        toast.error(result.message || 'Failed to add status');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error adding status');
    }
  };

  const handleDeleteStatus = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/status/${id}/delete`);
      const result = response.data;
      if (result.code === 1) {
        setStatuses(prev => prev.filter(s => s.id !== id));
        toast.success('Mission status deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete status');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting status');
    }
  };

  const handleEditStatus = async (updatedStatus: Mission) => {
    try {
      const response = await axios.post(`/api/mission/status/${updatedStatus.id}/update`, {
        mission_status_code: updatedStatus.code,
        mission_status_name: updatedStatus.name,
        mission_status_desc: updatedStatus.description,
        status_order: updatedStatus.order,
        is_final_status: updatedStatus.isFinalStatus,
      });
      const result = response.data;
      if (result.code === 1) {
        setStatuses(prev =>
          prev.map(s => s.id === updatedStatus.id ? updatedStatus : s)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        );
        toast.success('Mission status updated successfully');
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating status');
    }
  };

  if (loading) return <MissionStatusSkeleton isDark={isDark} />;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-white'}`}>
      <div className="w-full">

        <div
          className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
              ? "bg-slate-900/80 border-b border-slate-800 text-white"
              : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            } px-6 py-4`}
        >
          <div className="mx-auto max-w-[1800px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />

              <div>
                <h1
                  className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"
                    }`}
                >
                  Mission Status Management
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Define and maintain mission statuses for tracking flight operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className={`h-8 gap-1.5 text-xs font-semibold transition-all shadow-sm ${isDark
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-violet-600 hover:bg-violet-700 text-white"
                  }`}
              >
                <Plus size={14} />
                <span>Add Status</span>
              </Button>
            </div>
          </div>
        </div>

        <div className={`rounded-md m-4 border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mission Status List
            </h2>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              View and manage existing statuses
            </p>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <MissionStatusTable
              data={statuses}
              onDelete={handleDeleteStatus}
              onEdit={handleEditStatus}
              isDark={isDark}
            />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-lg ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>
              Add New Mission Status
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Fill in the details below to create a new mission status.
            </DialogDescription>
          </DialogHeader>
          <MissionStatusForm onSubmit={handleAddStatus} isDark={isDark} />
        </DialogContent>
      </Dialog>
    </div>
  );
}