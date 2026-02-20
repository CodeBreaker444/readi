'use client';

import { MissionResult } from '@/config/types/types';
import { useState } from 'react';

interface MissionResultFormProps {
  onSubmit: (result: Omit<MissionResult, 'id'>) => void;
  isDark: boolean;
}

export default function MissionResultForm({ onSubmit, isDark }: MissionResultFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ code: '', description: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={50}
          className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
          } focus:ring-2 focus:border-transparent`}
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="e.g., SUCCESS"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          maxLength={255}
          rows={3}
          className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
          } focus:ring-2 focus:border-transparent`}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Mission completed successfully"
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
      >
        Add Result
      </button>
    </form>
  );
}