'use client';

import { MissionType } from '@/src/config/types';
import { FormEvent, useState } from 'react';

interface MissionTypeFormProps {
  onSubmit: (data: Omit<MissionType, 'id'>) => void;
}

export default function MissionTypeForm({ onSubmit }: MissionTypeFormProps) {
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
        <label htmlFor="mission_type_desc" className="block text-sm font-semibold text-gray-700 mb-2">
          Description
        </label>
        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-150 bg-gray-50 hover:bg-white"
          type="text"
          id="mission_type_desc"
          name="mission_type_desc"
          placeholder="Enter mission type description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="mission_type_code" className="block text-sm font-semibold text-gray-700 mb-2">
          Code
        </label>
        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-150 bg-gray-50 hover:bg-white"
          type="text"
          id="mission_type_code"
          name="mission_type_code"
          placeholder="e.g., SURV"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          required
        />
      </div>

      <div>
        <label htmlFor="mission_type_label" className="block text-sm font-semibold text-gray-700 mb-2">
          Label
        </label>
        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-150 bg-gray-50 hover:bg-white"
          type="text"
          id="mission_type_label"
          name="mission_type_label"
          placeholder="Enter mission type label"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          required
        />
      </div>

      <button 
        type="submit" 
        className="w-full py-3 px-6 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 transform hover:-translate-y-0.5"
      >
        Add Mission Type
      </button>
    </form>
  );
}