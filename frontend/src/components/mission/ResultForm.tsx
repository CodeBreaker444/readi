'use client';

import { MissionResult } from '@/src/config/types';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface ResultFormProps {
  onSubmit: (data: Omit<MissionResult, 'id'>) => void;
  isDark: boolean
}

export default function ResultForm({ onSubmit, isDark}: ResultFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.description) {
      alert('Please fill in all fields');
      return;
    }

    onSubmit(formData);
    
    setFormData({
      code: '',
      description: '',
    });
  };

  return (
   <div className={`rounded-xl border shadow-sm p-6 mb-6 ${
  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
}`}>
  <h3 className={`text-lg font-semibold mb-4 ${
    isDark ? 'text-gray-100' : 'text-gray-900'
  }`}>Add New Result</h3>

  <form onSubmit={handleSubmit} className="flex gap-4 items-end">
    <div className="flex-1">
      <label
        htmlFor="mission_result_code"
        className={`block text-sm font-medium mb-2 ${
          isDark ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        Code
      </label>
      <input
        type="text"
        id="mission_result_code"
        name="mission_result_code"
        placeholder="Enter result code"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
        required
        className={`w-full px-4 py-2.5 border rounded-lg transition-all focus:ring-2 focus:border-transparent ${
          isDark
            ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
            : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
        }`}
      />
    </div>

    <div className="flex-1">
      <label
        htmlFor="mission_result_desc"
        className={`block text-sm font-medium mb-2 ${
          isDark ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        Description
      </label>
      <input
        type="text"
        id="mission_result_desc"
        name="mission_result_desc"
        placeholder="Enter result description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        required
        className={`w-full px-4 py-2.5 border rounded-lg transition-all focus:ring-2 focus:border-transparent ${
          isDark
            ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-blue-400'
            : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
        }`}
      />
    </div>

    <button
      type="submit"
      className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
    >
      <Plus size={20} />
      Add Result
    </button>
  </form>
</div>
  );
}