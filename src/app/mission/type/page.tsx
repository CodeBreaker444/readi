'use client';
import MissionTypeForm from '@/components/mission/MissionTypeForm';
import MissionTypeSkeleton from '@/components/mission/MissionTypeSkeleton';
import MissionTypeTable from '@/components/mission/MissionTypeTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { MissionType } from '@/config/types/types';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MissionTypePage() {
  const { isDark } = useTheme();
  const [missionTypes, setMissionTypes] = useState<MissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MissionType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchMissionTypes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/type/list`);
      const result = response.data;
      if (result.code === 1) setMissionTypes(result.data);
    } catch (error) { toast.error('Failed to fetch mission types'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMissionTypes(); }, []);

  const handleAddMissionType = async (newType: Omit<MissionType, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/type/add`, { mission_type_name: newType.name, mission_type_desc: newType.description, mission_type_code: newType.code, mission_type_label: newType.label });
      const result = response.data;
      if (result.code === 1) {
        setMissionTypes(prev => [...prev, { id: result.data.mission_type_id, name: result.data.type_name, code: result.data.type_code, label: result.data.type_description, description: result.data.type_description }]);
        toast.success('Mission type added successfully'); setIsAddDialogOpen(false);
      } else { toast.error(result.message || 'Failed to add mission type'); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error adding mission type'); }
  };

  const handleDeleteMissionType = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/type/${id}/delete`);
      const result = response.data;
      if (result.code === 1) { setMissionTypes(prev => prev.filter(type => type.id !== id)); toast.success('Mission type deleted successfully'); }
      else { toast.error(result.message || 'Failed to delete mission type'); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error deleting mission type'); }
  };

  const handleSaveEdit = async (data: Omit<MissionType, 'id'>) => {
    if (!editItem) return;
    const updatedType: MissionType = { ...data, id: editItem.id };
    try {
      const response = await axios.put(`/api/mission/type/${updatedType.id}/edit`, { mission_type_name: updatedType.name, mission_type_desc: updatedType.description, mission_type_code: updatedType.code, mission_type_label: updatedType.label });
      const result = response.data;
      if (result.code === 1) {
        setMissionTypes(prev => prev.map(type => type.id === updatedType.id ? updatedType : type));
        toast.success('Mission type updated successfully'); setIsEditDialogOpen(false); setEditItem(null);
      } else { toast.error(result.message || 'Failed to update mission type'); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error updating mission type'); }
  };

  const handleOpenEdit = (type: MissionType) => { setEditItem(type); setIsEditDialogOpen(true); };

  if (loading) return <MissionTypeSkeleton isDark={isDark} />;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div className={`top-0 z-20 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#0a0e1a]/90 border-white/[0.06]' : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto max-w-[1600px] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${isDark ? 'text-white' : 'text-gray-900'}`}>Mission Types</h1>
              <p className={`text-[11px] mt-0.5 tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{missionTypes.length} total &middot; Manage and configure mission types</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="h-8 gap-1.5 px-3.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-violet-600 hover:bg-violet-700">
            <Plus size={13} strokeWidth={2.5} /><span>New Type</span>
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]' : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Type Definitions</h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Configure mission types for your operations</p>
          </div>
          <div className="p-0"><MissionTypeTable data={missionTypes} onDelete={(id) => setDeleteId(id)} onEdit={handleOpenEdit} isDark={isDark} /></div>
        </div>
      </div>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Mission Type</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Fill in the details to create a new mission type.</DialogDescription>
          </DialogHeader>
          <MissionTypeForm onSubmit={handleAddMissionType} isDark={isDark} mode="add" />
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditItem(null); }}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Mission Type</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Update the mission type details.</DialogDescription>
          </DialogHeader>
          {editItem && <MissionTypeForm key={editItem.id} onSubmit={handleSaveEdit} isDark={isDark} initialData={editItem} mode="edit" />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mission Type</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this mission type? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (deleteId !== null) { handleDeleteMissionType(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
