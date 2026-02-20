'use client';

import { MissionCategory } from '@/config/types/types';
import { useState } from 'react';

interface MissionCategoryFormProps {
  onSubmit: (category: Omit<MissionCategory, 'id'>) => void;
  isDark: boolean;
}

export default function MissionCategoryForm({ onSubmit, isDark }: MissionCategoryFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ code: '', name: '', description: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Category Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={50}
          className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${isDark
              ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
            } focus:ring-2 focus:border-transparent`}
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="e.g., COMMERCIAL"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Category Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={100}
          className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${isDark
              ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
            } focus:ring-2 focus:border-transparent`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Commercial"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Description
        </label>
        <textarea
          rows={3}
          className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${isDark
              ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
            } focus:ring-2 focus:border-transparent`}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Commercial client work"
        />
      </div>

      <button
        type="submit"
        className={`w-full px-4 py-2.5 ${isDark
          ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
          : 'bg-gray-50 hover:bg-gray-200 text-gray-700 border border-gray-300'
          } rounded-lg font-medium transition-colors`}
      >
        Add Category
      </button>
    </form>
  );
}