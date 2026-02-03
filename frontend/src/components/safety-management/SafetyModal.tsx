'use client';

import { SafetyIndicator } from '@/src/config/types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  indicator: SafetyIndicator | null;
}

export default function SafetyModal({
  isOpen,
  onClose,
  onSave,
  indicator,
}: SafetyModalProps) {
  const [formData, setFormData] = useState({
    indicator_code: '',
    indicator_type: 'KPI' as 'KPI' | 'SPI',
    indicator_area: 'COMPLIANCE' as 'COMPLIANCE' | 'TRAINING' | 'OPERATIONS' | 'MAINTENANCE',
    indicator_name: '',
    indicator_desc: '',
    target_value: '0',
    unit: '%',
    frequency: 'MONTHLY',
    is_active: 1,
  });

  useEffect(() => {
    if (indicator) {
      setFormData({
        indicator_code: indicator.indicator_code,
        indicator_type: indicator.indicator_type,
        indicator_area: indicator.indicator_area,
        indicator_name: indicator.indicator_name,
        indicator_desc: indicator.indicator_desc || '',
        target_value: indicator.target_value.toString(),
        unit: indicator.unit,
        frequency: indicator.frequency,
        is_active: indicator.is_active,
      });
    } else {
      setFormData({
        indicator_code: '',
        indicator_type: 'KPI',
        indicator_area: 'COMPLIANCE',
        indicator_name: '',
        indicator_desc: '',
        target_value: '0',
        unit: '%',
        frequency: 'MONTHLY',
        is_active: 1,
      });
    }
  }, [indicator]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.indicator_name || !formData.unit) {
      alert('Nome e unit obbligatori');
      return;
    }
    
    if (!indicator && !formData.indicator_code) {
      alert('Codice obbligatorio');
      return;
    }
    
    onSave({
      ...formData,
      target_value: parseFloat(formData.target_value),
    });
  };

  if (!isOpen) return null;

  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-800 text-white">
      <h2 className="text-xl font-semibold">Indicator</h2>
      <button
        onClick={onClose}
        className="text-gray-300 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
    </div>

    <form
      onSubmit={handleSubmit}
      className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-white mb-1">
            Code
          </label>
          <input
            type="text"
            value={formData.indicator_code}
            onChange={(e) => handleChange('indicator_code', e.target.value)}
            disabled={!!indicator}
            placeholder="e.g. TRAIN_COMPLIANCE_RATE"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <small className="text-gray-400">
            Immutable after saving
          </small>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Type
          </label>
          <select
            value={formData.indicator_type}
            onChange={(e) => handleChange('indicator_type', e.target.value)}
            disabled={!!indicator}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            <option value="KPI">KPI</option>
            <option value="SPI">SPI</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Area
          </label>
          <select
            value={formData.indicator_area}
            onChange={(e) => handleChange('indicator_area', e.target.value)}
            disabled={!!indicator}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            <option value="COMPLIANCE">COMPLIANCE</option>
            <option value="TRAINING">TRAINING</option>
            <option value="OPERATIONS">OPERATIONS</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Unit
          </label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
            placeholder="% / n / h"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.indicator_name}
            onChange={(e) => handleChange('indicator_name', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Target
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.target_value}
            onChange={(e) => handleChange('target_value', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Frequency
          </label>
          <input
            type="text"
            value={formData.frequency}
            onChange={(e) => handleChange('frequency', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white mb-1">
            Description
          </label>
          <textarea
            value={formData.indicator_desc}
            onChange={(e) => handleChange('indicator_desc', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Active
          </label>
          <select
            value={formData.is_active}
            onChange={(e) =>
              handleChange('is_active', parseInt(e.target.value))
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>
      </div>
    </form>

    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-800">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Close
      </button>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Save
      </button>
    </div>
  </div>
</div>

  );
}