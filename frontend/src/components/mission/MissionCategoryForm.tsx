'use client';

import { MissionCategory } from '@/src/config/types';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface MissionCategoryFormProps {
  onSubmit: (data: Omit<MissionCategory, 'id'>) => void;
}

export default function MissionCategoryForm({ onSubmit }: MissionCategoryFormProps) {
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h3>
      <form onSubmit={handleSubmit} className="flex gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="mission_category_desc" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <input
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          <Plus size={20} />
          Add Category
        </button>
      </form>
    </div>
  );
}