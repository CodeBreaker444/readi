'use client';

import { MissionStatus } from '@/src/config/types';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface StatusFormProps {
  onSubmit: (data: Omit<MissionStatus, 'id'>) => void;
}

export default function StatusForm({ onSubmit }: StatusFormProps) {
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Status</h3>
      <form onSubmit={handleSubmit} className="flex gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="mission_status_code" className="block text-sm font-medium text-gray-700 mb-2">
            Code
          </label>
          <input
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
          <label htmlFor="mission_status_desc" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <input
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          <Plus size={20} />
          Add Status
        </button>
      </form>
    </div>
  );
}