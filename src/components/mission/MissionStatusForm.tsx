'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mission } from '@/config/types/types';
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
    isFinalStatus: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ code: '', name: '', description: '', order: 0, isFinalStatus: false });
  };

  const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            Code <span className="text-red-500">*</span>
          </Label>
          <Input
            required
            maxLength={50}
            placeholder="e.g., PLANNED"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className={`uppercase ${inputClass}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            required
            maxLength={100}
            placeholder="e.g., Planned"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Description</Label>
        <Textarea
          rows={3}
          placeholder="e.g., Mission is in planning phase"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Order</Label>
          <Input
            type="number"
            min="0"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            className={inputClass}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={formData.isFinalStatus}
              onCheckedChange={(checked: boolean | "indeterminate") => setFormData({ ...formData, isFinalStatus: !!checked })}
            />
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Final Status
            </span>
          </label>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 mt-2"
      >
        Add Status
      </Button>
    </form>
  );
}