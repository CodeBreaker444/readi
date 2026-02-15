'use client';

import MissionCategoryForm from '@/components/mission/MissionCategoryForm';
import MissionCategoryTable from '@/components/mission/MissionCategoryTable';
import { useTheme } from '@/components/useTheme';
import { MissionCategory } from '@/config/types';
import axios from 'axios';
import { useEffect, useState } from 'react';

const dummyMissionCategories: MissionCategory[] = [
  { id: 1, description: 'Commercial Operations' },
  { id: 2, description: 'Public Safety' },
  { id: 3, description: 'Research & Development' },
  { id: 4, description: 'Military Operations' },
  { id: 5, description: 'Environmental Monitoring' },
  { id: 6, description: 'Agricultural Surveys' },
];

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
      const response = await fetch(`/api/owner/${session.user.ownerId}/missionCategory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_category_desc: newCategory.description
        })
      });
      
      const result = await response.json();
      if (result.code === 1) {
        await fetchCategories();
      } else {
        alert('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!session?.user?.ownerId) return;
    
    try {
      const response = await fetch(
        `/api/owner/${session.user.ownerId}/missionCategory/${id}/delete`,
        { method: 'POST' }
      );
      
      const result = await response.json();
      if (result.code === 1) {
        await fetchCategories();
      } else {
        alert('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    }
  };

  const handleEditCategory = async (updatedCategory: MissionCategory) => {
    
    try {
      const response = await fetch(
        `/api/mission/category/${updatedCategory.id}/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mission_category_desc: updatedCategory.description
          })
        }
      );
      
      const result = await response.json();
      if (result.code === 1) {
        await fetchCategories();
      } else {
        alert('Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category');
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