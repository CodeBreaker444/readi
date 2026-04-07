'use client';
import MissionCategoryForm from '@/components/mission/MissionCategoryForm';
import MissionCategorySkeleton from '@/components/mission/MissionCategorySkeleton';
import MissionCategoryTable from '@/components/mission/MissionCategoryTable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { MissionCategory } from '@/config/types/types';
import axios from 'axios';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function MissionCategoryPage() {
  const { isDark } = useTheme();
  const [categories, setCategories] = useState<MissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MissionCategory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/category/list`);
      const result = response.data;
      if (result.code === 1) {
        setCategories(result.data.map((item: any) => ({ id: item.mission_category_id, code: item.mission_category_code, name: item.mission_category_name, description: item.mission_category_desc })));
      }
    } catch (error) { toast.error('Failed to fetch categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAddCategory = async (newCategory: Omit<MissionCategory, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/category/add`, { mission_category_code: newCategory.code, mission_category_name: newCategory.name, mission_category_desc: newCategory.description });
      const result = response.data;
      if (result.code === 1) {
        setCategories(prev => [...prev, { id: result.data.category_id, code: result.data.category_code, name: result.data.category_name, description: result.data.category_description }]);
        toast.success('Category added successfully'); setIsAddDialogOpen(false);
      } else { toast.error(result.message || 'Failed to add category'); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error adding category'); }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/category/${id}/delete`);
      const result = response.data;
      if (result.code === 1) { setCategories(prev => prev.filter(cat => cat.id !== id)); toast.success('Category deleted successfully'); }
      else { toast.error(result.message || 'Failed to delete category'); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error deleting category'); }
  };

  const handleSaveEdit = async (data: Omit<MissionCategory, 'id'>) => {
    if (!editItem) return;
    const updatedCategory: MissionCategory = { ...data, id: editItem.id };
    try {
      const response = await axios.post(`/api/mission/category/${updatedCategory.id}/update`, { mission_category_code: updatedCategory.code, mission_category_name: updatedCategory.name, mission_category_desc: updatedCategory.description });
      const result = response.data;
      if (result.code === 1) {
        setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
        toast.success('Category updated successfully'); setIsEditDialogOpen(false); setEditItem(null);
      } else { toast.error(result.message || 'Failed to update category'); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error updating category'); }
  };

  const handleOpenEdit = (category: MissionCategory) => { setEditItem(category); setIsEditDialogOpen(true); };

  if (loading) return <MissionCategorySkeleton isDark={isDark} />;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div className={`top-0 z-20 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#0a0e1a]/90 border-white/[0.06]' : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${isDark ? 'text-white' : 'text-gray-900'}`}>Mission Categories</h1>
              <p className={`text-[11px] mt-0.5 tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{categories.length} total &middot; Define and maintain mission categories</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="h-8 gap-1.5 px-3.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-violet-600 hover:bg-violet-700">
            <Plus size={13} strokeWidth={2.5} /><span>New Category</span>
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]' : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Category Definitions</h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Configure mission categories used across operations</p>
          </div>
          <div className="p-0"><MissionCategoryTable data={categories} onDelete={(id) => setDeleteId(id)} onEdit={handleOpenEdit} isDark={isDark} /></div>
        </div>
      </div>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Category</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Define a new mission category for your operations.</DialogDescription>
          </DialogHeader>
          <MissionCategoryForm onSubmit={handleAddCategory} isDark={isDark} mode="add" />
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditItem(null); }}>
        <DialogContent className={`sm:max-w-lg rounded-xl ${isDark ? 'bg-[#0f1320] border-white/[0.08] text-white shadow-[0_25px_60px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-2xl'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Category</DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Update the mission category details.</DialogDescription>
          </DialogHeader>
          {editItem && <MissionCategoryForm key={editItem.id} onSubmit={handleSaveEdit} isDark={isDark} initialData={editItem} mode="edit" />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this mission category? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { if (deleteId !== null) { handleDeleteCategory(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
