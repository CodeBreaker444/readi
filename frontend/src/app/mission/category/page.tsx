'use client';

import MissionCategoryForm from '@/src/components/mission/MissionCategoryForm';
import MissionCategoryTable from '@/src/components/mission/MissionCategoryTable';
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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Mission | Category Management
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Define and maintain mission categories used across operations.
        </p>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Mission Category List
            </h2>
          </div>
          <div className="p-4">
            <MissionCategoryTable
              data={categories}
              onDelete={handleDeleteCategory}
              onEdit={handleEditCategory}
            />
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Add Mission Category
            </h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Fill the form below to add a new mission category.
            </p>
            <MissionCategoryForm onSubmit={handleAddCategory} />
          </div>
        </div>
      </div>
    </div>
  );
}