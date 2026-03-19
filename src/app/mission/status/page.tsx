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
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchStatuses = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
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
      setRefreshing(false);
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

  const finalCount = statuses.filter(s => s.isFinalStatus).length;
  const activeCount = statuses.length - finalCount;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div
        className={`sticky top-0 z-20 backdrop-blur-xl border-b transition-colors ${
          isDark
            ? 'bg-[#0a0e1a]/90 border-white/[0.06]'
            : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
      >
        <div className="mx-auto max-w-[1600px] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
                <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Mission Statuses
              </h1>
              <p className={`text-[11px] mt-0.5 tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {statuses.length} total &middot; {activeCount} active &middot; {finalCount} final
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className={`h-8 gap-1.5 px-3.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-violet-600 hover:bg-violet-700`}
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>New Status</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div
          className={`rounded-xl border overflow-hidden ${
            isDark
              ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
              : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]'
          }`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-white/[0.06]' : 'border-gray-100'
          }`}>
            <div>
              <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Status Definitions
              </h2>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Configure workflow stages for mission tracking
              </p>
            </div>
          </div>

          <div className="p-0">
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
        <DialogContent className={`sm:max-w-lg rounded-xl ${
          isDark
            ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]'
            : 'bg-white border-gray-200 shadow-2xl'
        }`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Create New Status
            </DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Define a new workflow stage for mission operations.
            </DialogDescription>
          </DialogHeader>
          <MissionStatusForm onSubmit={handleAddStatus} isDark={isDark} />
        </DialogContent>
      </Dialog>
    </div>
  );
}