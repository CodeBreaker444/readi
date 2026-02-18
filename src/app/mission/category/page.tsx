'use client';

import MissionCategoryForm from '@/components/mission/MissionCategoryForm';
import MissionCategoryTable from '@/components/mission/MissionCategoryTable';
import { useTheme } from '@/components/useTheme';
import { MissionCategory } from '@/config/types/types';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';


export default function MissionCategoryPage() {
  const { isDark } = useTheme();
  const [categories, setCategories] = useState<MissionCategory[]>([]);
  const [loading, setLoading] = useState(true);

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
  <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
  <div className="mb-6">
    <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
      Mission | Category Management
    </h1>
    <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
      Define and maintain mission categories used across operations.
    </p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

    <div className={`rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
        <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Add Mission Category
        </h2>
      </div>
      <div className="p-4">
        <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Fill the form below to add a new mission category.
        </p>
        <MissionCategoryForm onSubmit={handleAddCategory} isDark={isDark}/>
      </div>
    </div>
  </div>
</div>

  );
}