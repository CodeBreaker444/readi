'use client';

import { Mission } from '@/config/types';
import { useState } from 'react';

interface MissionStatusFormProps {
  onSubmit: (status: Omit<Mission, 'id'>) => void;
  isDark: boolean;
}

export default function MissionStatusForm({ onSubmit, isDark }: MissionStatusFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    order: 0,
    isFinalStatus: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ code: '', name: '', description: '', order: 0, isFinalStatus: false });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
            placeholder="e.g., PLANNED"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
                : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
            } focus:ring-2 focus:border-transparent`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Planned"
          />
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Description
        </label>
        <textarea
          rows={3}
          className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
          } focus:ring-2 focus:border-transparent`}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Mission is in planning phase"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            Order
          </label>
          <input
            type="number"
            min="0"
            className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-600 text-white focus:ring-blue-500'
                : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
            } focus:ring-2 focus:border-transparent`}
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.isFinalStatus}
              onChange={(e) => setFormData({ ...formData, isFinalStatus: e.target.checked })}
            />
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Final Status
            </span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
      >
        Add Status
      </button>
    </form>
  );
}