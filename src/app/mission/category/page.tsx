'use client';

import MissionCategoryForm from '@/components/mission/MissionCategoryForm';
import MissionCategoryTable from '@/components/mission/MissionCategoryTable';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/mission/category/list`);

      const result = response.data;
      if (result.code === 1) {
        setCategories(result.data.map((item: any) => ({
          id: item.mission_category_id,
          code: item.mission_category_code,
          name: item.mission_category_name,
          description: item.mission_category_desc
        })));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (newCategory: Omit<MissionCategory, 'id'>) => {
    try {
      const response = await axios.post(`/api/mission/category/add`, {
        mission_category_code: newCategory.code,
        mission_category_name: newCategory.name,
        mission_category_desc: newCategory.description
      });

      const result = response.data;
      if (result.code === 1) {
        const newCat: MissionCategory = {
          id: result.data.category_id,
          code: result.data.category_code,
          name: result.data.category_name,
          description: result.data.category_description
        };
        setCategories(prev => [...prev, newCat]);
      } else {
        toast.error(result.message || 'Failed to add category');
      }
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error(error.response?.data?.message || 'Error adding category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const response = await axios.post(`/api/mission/category/${id}/delete`);

      const result = response.data;
      if (result.code === 1) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
        toast.success('Category deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete category');
      }
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Error deleting category');
    }
  };

  const handleEditCategory = async (updatedCategory: MissionCategory) => {
    try {
      const response = await axios.post(
        `/api/mission/category/${updatedCategory.id}/update`,
        {
          mission_category_code: updatedCategory.code,
          mission_category_name: updatedCategory.name,
          mission_category_desc: updatedCategory.description
        }
      );

      const result = response.data;
      if (result.code === 1) {
        setCategories(prev =>
          prev.map(cat =>
            cat.id === updatedCategory.id ? updatedCategory : cat
          )
        );
      } else {
        toast.error(result.message || 'Failed to update category');
      }
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.message || 'Error updating category');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className={`top-0 z-10 backdrop-blur-md transition-colors w-full ${isDark
          ? "bg-slate-900/80 border-b border-slate-800 text-white"
          : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        } px-6 py-4 mb-8`}>
        <div className="mx-auto max-w-[1800px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                Mission | Category Management
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Define and maintain mission categories used across operations
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus size={16} />
            Add Category
          </Button>
        </div>
      </div>

      <div className="mx-3">
        <div className={`rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Mission Category List
            </h2>
          </div>
          <div className="p-4">
            <MissionCategoryTable
              data={categories}
              onDelete={handleDeleteCategory}
              onEdit={handleEditCategory}
              isDark={isDark}
            />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-md ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>
              Add Mission Category
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              Fill the form below to add a new mission category.
            </DialogDescription>
          </DialogHeader>
          <MissionCategoryForm
            onSubmit={(data) => {
              handleAddCategory(data);
              setIsDialogOpen(false);
            }}
            isDark={isDark}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}