'use client';

import MissionCategoryForm from '@/src/components/mission/MissionCategoryForm';
import MissionCategoryTable from '@/src/components/mission/MissionCategoryTable';
import { useTheme } from '@/src/components/useTheme';
import { MissionCategory } from '@/src/config/types';
import { useState } from 'react';

const dummyMissionCategories: MissionCategory[] = [
  { id: 1, description: 'Commercial Operations' },
  { id: 2, description: 'Public Safety' },
  { id: 3, description: 'Research & Development' },
  { id: 4, description: 'Military Operations' },
  { id: 5, description: 'Environmental Monitoring' },
  { id: 6, description: 'Agricultural Surveys' },
];

export default function MissionCategoryPage() {
  const { isDark } = useTheme()
  const [categories, setCategories] = useState<MissionCategory[]>(dummyMissionCategories);

  const handleAddCategory = (newCategory: Omit<MissionCategory, 'id'>) => {
    const newItem: MissionCategory = {
      ...newCategory,
      id: Math.max(...categories.map(c => c.id), 0) + 1,
    };
    setCategories([...categories, newItem]);
  };

  const handleDeleteCategory = (id: number) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const handleEditCategory = (updatedCategory: MissionCategory) => {
    setCategories(categories.map(cat =>
      cat.id === updatedCategory.id ? updatedCategory : cat
    ));
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