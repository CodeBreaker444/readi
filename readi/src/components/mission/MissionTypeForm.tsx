'use client';

import { MissionType } from '@/config/types';
import { FormEvent, useState } from 'react';

interface MissionTypeFormProps {
  onSubmit: (data: Omit<MissionType, 'id'>) => void;
  isDark : boolean
}

export default function MissionTypeForm({ onSubmit, isDark }: MissionTypeFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    code: '',
    label: '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.code || !formData.label) {
      alert('Please fill in all fields');
      return;
    }

    onSubmit(formData);
    
    setFormData({
      description: '',
      code: '',
      label: '',
    });
  };

  return (
 <form onSubmit={handleSubmit} className="space-y-5">
  <div>
    <label htmlFor="mission_type_desc" className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
    <input
      type="text"
      id="mission_type_desc"
      name="mission_type_desc"
      placeholder="Enter mission type description"
      value={formData.description}
      onChange={e => setFormData({ ...formData, description: e.target.value })}
      required
      className={`w-full px-4 py-3 rounded-lg outline-none transition-all duration-150 border focus:ring-2 focus:ring-green-500 focus:border-transparent ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-gray-50 hover:bg-white border-gray-300 text-gray-800'}`}
    />
  </div>

  <div>
    <label htmlFor="mission_type_code" className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Code</label>
    <input
      type="text"
      id="mission_type_code"
      name="mission_type_code"
      placeholder="e.g., SURV"
      value={formData.code}
      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
      required
      className={`w-full px-4 py-3 rounded-lg outline-none transition-all duration-150 border focus:ring-2 focus:ring-green-500 focus:border-transparent ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-gray-50 hover:bg-white border-gray-300 text-gray-800'}`}
    />
  </div>

  <div>
    <label htmlFor="mission_type_label" className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Label</label>
    <input
      type="text"
      id="mission_type_label"
      name="mission_type_label"
      placeholder="Enter mission type label"
      value={formData.label}
      onChange={e => setFormData({ ...formData, label: e.target.value })}
      required
      className={`w-full px-4 py-3 rounded-lg outline-none transition-all duration-150 border focus:ring-2 focus:ring-green-500 focus:border-transparent ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-gray-50 hover:bg-white border-gray-300 text-gray-800'}`}
    />
  </div>

  <button type="submit" className="w-full py-3 px-6 rounded-lg font-semibold text-white shadow-md transition-all duration-150 transform hover:-translate-y-0.5 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
    Add Mission Type
  </button>
</form>

  );
}