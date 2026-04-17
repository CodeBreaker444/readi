'use client';
import MissionStatusForm from '@/components/mission/MissionStatusForm';
import MissionStatusTable from '@/components/mission/MissionStatusTable';
import MissionStatusSkeleton from '@/components/mission/StatusSkeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { Mission } from '@/config/types/types';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function MissionStatusPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Mission | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/status/list`);
      const result = response.data;
      if (result.code === 1) {
        setStatuses(result.data.map((item: any) => ({
          id: item.mission_status_id, code: item.mission_status_code, name: item.mission_status_name,
          description: item.mission_status_desc, order: item.status_order, isFinalStatus: item.is_final_status,
        })));
      }
    } catch (error) {
      toast.error(t('missionStatus.errors.fetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatuses(); }, []);

  const handleAddStatus = async (newStatus: Omit<Mission, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/status/add`, {
        mission_status_code: newStatus.code, mission_status_name: newStatus.name,
        mission_status_desc: newStatus.description, status_order: newStatus.order, is_final_status: newStatus.isFinalStatus,
      });
      const result = response.data;
      if (result.code === 1) {
        const added: Mission = { id: result.data.status_id, code: result.data.status_code, name: result.data.status_name, description: result.data.status_description, order: result.data.status_order, isFinalStatus: result.data.is_final_status };
        setStatuses(prev => [...prev, added].sort((a, b) => (a.order || 0) - (b.order || 0)));
        toast.success(t('missionStatus.success.added'));
        setIsAddDialogOpen(false);
      } else { toast.error(result.message || t('missionStatus.errors.add')); }
    } catch (error: any) { toast.error(error.response?.data?.message || t('missionStatus.errors.add')); }
  };

  const handleDeleteStatus = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/status/${id}/delete`);
      const result = response.data;
      if (result.code === 1) { setStatuses(prev => prev.filter(s => s.id !== id)); toast.success(t('missionStatus.success.deleted')); }
      else { toast.error(result.message || t('missionStatus.errors.delete')); }
    } catch (error: any) { toast.error(error.response?.data?.message || t('missionStatus.errors.delete')); }
  };

  const handleSaveEdit = async (data: Omit<Mission, 'id'>) => {
    if (!editItem) return;
    const updatedStatus: Mission = { ...data, id: editItem.id };
    try {
      const response = await axios.post(`/api/mission/status/${updatedStatus.id}/update`, {
        mission_status_code: updatedStatus.code, mission_status_name: updatedStatus.name,
        mission_status_desc: updatedStatus.description, status_order: updatedStatus.order, is_final_status: updatedStatus.isFinalStatus,
      });
      const result = response.data;
      if (result.code === 1) {
        setStatuses(prev => prev.map(s => s.id === updatedStatus.id ? updatedStatus : s).sort((a, b) => (a.order || 0) - (b.order || 0)));
        toast.success(t('missionStatus.success.updated'));
        setIsEditDialogOpen(false);
        setEditItem(null);
      } else { toast.error(result.message || t('missionStatus.errors.update')); }
    } catch (error: any) { toast.error(error.response?.data?.message || t('missionStatus.errors.update')); }
  };

  const handleOpenEdit = (status: Mission) => { setEditItem(status); setIsEditDialogOpen(true); };

  if (loading) return <MissionStatusSkeleton isDark={isDark} />;

  const finalCount = statuses.filter(s => s.isFinalStatus).length;
  const activeCount = statuses.length - finalCount;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div className={`top-0 z-20 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#0a0e1a]/90 border-white/[0.06]' : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto max-w-[1600px] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionStatus.title')}</h1>
              <p className={`text-[11px] mt-0.5 tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionStatus.summary', { total: statuses.length, active: activeCount, final: finalCount })}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="h-8 gap-1.5 px-3.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-violet-600 hover:bg-violet-700">
            <Plus size={13} strokeWidth={2.5} /><span>{t('missionStatus.new')}</span>
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]' : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionStatus.definitions')}</h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionStatus.description')}</p>
          </div>
          <div className="p-0">
            <MissionStatusTable data={statuses} onDelete={(id) => setDeleteId(id)} onEdit={handleOpenEdit} isDark={isDark} />
          </div>
        </div>
      </div>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionStatus.createTitle')}</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionStatus.createDescription')}</DialogDescription>
          </DialogHeader>
          <MissionStatusForm onSubmit={handleAddStatus} isDark={isDark} mode="add" />
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditItem(null); }}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionStatus.editTitle')}</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionStatus.editDescription')}</DialogDescription>
          </DialogHeader>
          {editItem && <MissionStatusForm key={editItem.id} onSubmit={handleSaveEdit} isDark={isDark} initialData={editItem} mode="edit" />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('missionStatus.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('missionStatus.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (deleteId !== null) { handleDeleteStatus(deleteId); setDeleteId(null); } }}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
