'use client';
import MissionResultForm from '@/components/mission/MissionResultForm';
import MissionResultSkeleton from '@/components/mission/MissionResultSkeleton';
import MissionResultTable from '@/components/mission/MissionResultTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { MissionResult } from '@/config/types/types';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function MissionResultPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [results, setResults] = useState<MissionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MissionResult | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/result/list`);
      const result = response.data;
      if (result.code === 1) {
        setResults(result.data.map((item: any) => ({ id: item.mission_result_id, code: item.mission_result_code, description: item.mission_result_desc })));
      }
    } catch (error) { toast.error(t('missionResult.errors.fetch')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResults(); }, []);

  const handleAddResult = async (newResult: Omit<MissionResult, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/result/add`, { mission_result_code: newResult.code, mission_result_desc: newResult.description });
      const result = response.data;
      if (result.code === 1) {
        setResults(prev => [...prev, { id: result.data.result_id, code: result.data.result_type, description: result.data.result_description }]);
        toast.success(t('missionResult.success.added')); setIsAddDialogOpen(false);
      } else { toast.error(result.message || t('missionResult.errors.add')); }
    } catch (error: any) { toast.error(error.response?.data?.message || t('missionResult.errors.add')); }
  };

  const handleDeleteResult = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/result/${id}/delete`);
      const result = response.data;
      if (result.code === 1) { setResults(prev => prev.filter(r => r.id !== id)); toast.success(t('missionResult.success.deleted')); }
      else { toast.error(result.message || t('missionResult.errors.delete')); }
    } catch (error: any) { toast.error(error.response?.data?.message || t('missionResult.errors.delete')); }
  };

  const handleSaveEdit = async (data: Omit<MissionResult, 'id'>) => {
    if (!editItem) return;
    const updatedResult: MissionResult = { ...data, id: editItem.id };
    try {
      const response = await axios.post(`/api/mission/result/${updatedResult.id}/update`, { mission_result_code: updatedResult.code, mission_result_desc: updatedResult.description });
      const result = response.data;
      if (result.code === 1) {
        setResults(prev => prev.map(r => r.id === updatedResult.id ? updatedResult : r));
        toast.success(t('missionResult.success.updated')); setIsEditDialogOpen(false); setEditItem(null);
      } else { toast.error(result.message || t('missionResult.errors.update')); }
    } catch (error: any) { toast.error(error.response?.data?.message || t('missionResult.errors.update')); }
  };

  const handleOpenEdit = (result: MissionResult) => { setEditItem(result); setIsEditDialogOpen(true); };

  if (loading) return <MissionResultSkeleton isDark={isDark} />;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div className={`top-0 z-20 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#0a0e1a]/90 border-white/[0.06]' : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto max-w-[1600px] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionResult.title')}</h1>
              <p className={`text-[11px] mt-0.5 tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionResult.summary', { total: results.length })}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="h-8 gap-1.5 px-3.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-violet-600 hover:bg-violet-700">
            <Plus size={13} strokeWidth={2.5} /><span>{t('missionResult.new')}</span>
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]' : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionResult.definitions')}</h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionResult.description')}</p>
          </div>
          <div className="p-0"><MissionResultTable data={results} onDelete={(id) => setDeleteId(id)} onEdit={handleOpenEdit} isDark={isDark} /></div>
        </div>
      </div>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionResult.createTitle')}</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionResult.createDescription')}</DialogDescription>
          </DialogHeader>
          <MissionResultForm onSubmit={handleAddResult} isDark={isDark} mode="add" />
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditItem(null); }}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('missionResult.editTitle')}</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('missionResult.editDescription')}</DialogDescription>
          </DialogHeader>
          {editItem && <MissionResultForm key={editItem.id} onSubmit={handleSaveEdit} isDark={isDark} initialData={editItem} mode="edit" />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('missionResult.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('missionResult.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (deleteId !== null) { handleDeleteResult(deleteId); setDeleteId(null); } }}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
