'use client';

import { MissionCategory } from '@/config/types';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface MissionCategoryFormProps {
  onSubmit: (data: Omit<MissionCategory, 'id'>) => void;
  isDark: boolean
}

export default function MissionCategoryForm({ onSubmit, isDark }: MissionCategoryFormProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    onSubmit({ description });
    setDescription('');
  };

  return (
   <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-sm p-6 mb-6`}>
  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Add New Category</h3>
  <form onSubmit={handleSubmit} className="flex gap-4 items-end">
    <div className="flex-1">
      <label htmlFor="mission_category_desc" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Description
      </label>
      <input
        className={`w-full px-4 py-2.5 rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
        type="text"
        id="mission_category_desc"
        name="mission_category_desc"
        placeholder="Enter category description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
    </div>
    <button
      type="submit"
      className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
    >
      <Plus size={20} />
      Add Category
    </button>
  </form>
</div>

  );
}