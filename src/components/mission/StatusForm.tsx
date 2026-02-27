'use client';

import { MissionStatus } from '@/config/types/types';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface StatusFormProps {
  onSubmit: (data: Omit<MissionStatus, 'id'>) => void;
  isDark: boolean
}

export default function StatusForm({ onSubmit, isDark }: StatusFormProps) {
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
   <div className={`rounded-xl border shadow-sm p-6 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
    Add New Status
  </h3>
  <form onSubmit={handleSubmit} className="flex gap-4 items-end">
    <div className="flex-1">
      <label htmlFor="mission_status_code" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Code
      </label>
      <input
        className={`w-full px-4 py-2.5 rounded-lg transition-all border focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${isDark ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        type="text"
        id="mission_status_code"
        name="mission_status_code"
        placeholder="Enter status code"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
        required
      />
    </div>

    <div className="flex-1">
      <label htmlFor="mission_status_desc" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Description
      </label>
      <input
        className={`w-full px-4 py-2.5 rounded-lg transition-all border focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${isDark ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
        type="text"
        id="mission_status_desc"
        name="mission_status_desc"
        placeholder="Enter status description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        required
      />
    </div>

    <button 
      type="submit" 
      className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white transition-all  font-medium"
    >
      <Plus size={20} />
      Add Status
    </button>
  </form>
</div>
  );
}