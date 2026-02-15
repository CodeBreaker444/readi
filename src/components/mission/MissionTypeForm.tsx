'use client';

import { MissionType } from '@/config/types';
import { FormEvent, useState } from 'react';

interface MissionTypeFormProps {
  onSubmit: (data: Omit<MissionType, 'id'>) => void;
  isDark : boolean
}

export default function MissionTypeForm({ onSubmit, isDark }: MissionTypeFormProps) {
  const [formData, setFormData] = useState({
    name: '',
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
      name: '',
      description: '',
      code: '',
      label: '',
    });
  };

  return (
  <form onSubmit={handleSubmit} className="space-y-6">
     <div>
      <label htmlFor="mission_type_name" className={`block text-sm font-bold mb-2.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Name <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="mission_type_name"
        name="mission_type_name"
        placeholder="Enter mission type name"
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        required
        className={`w-full px-4 py-3.5 rounded-lg outline-none transition-all duration-200 border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'}`}
      />
    </div>
    <div>
      <label htmlFor="mission_type_desc" className={`block text-sm font-bold mb-2.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Description <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="mission_type_desc"
        name="mission_type_desc"
        placeholder="Enter mission type description"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        required
        className={`w-full px-4 py-3.5 rounded-lg outline-none transition-all duration-200 border-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'}`}
      />
    </div>

    <div>
      <label htmlFor="mission_type_code" className={`block text-sm font-bold mb-2.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Code <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="mission_type_code"
        name="mission_type_code"
        placeholder="e.g., SURV"
        value={formData.code}
        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
        required
        className={`w-full px-4 py-3.5 rounded-lg outline-none transition-all duration-200 border-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'}`}
      />
    </div>

    <div>
      <label htmlFor="mission_type_label" className={`block text-sm font-bold mb-2.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        Label <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="mission_type_label"
        name="mission_type_label"
        placeholder="Enter mission type label"
        value={formData.label}
        onChange={e => setFormData({ ...formData, label: e.target.value })}
        required
        className={`w-full px-4 py-3.5 rounded-lg outline-none transition-all duration-200 border-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'}`}
      />
    </div>

    <button 
      type="submit" 
      className="w-full py-3.5 px-6 rounded-lg font-bold text-white shadow-lg transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
    >
      Add Mission Type
    </button>
  </form>
);
}