'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MissionResult } from '@/config/types/types';
import { useState } from 'react';

interface MissionResultFormProps {
  onSubmit: (result: Omit<MissionResult, 'id'>) => void;
  isDark: boolean;
}

export default function MissionResultForm({ onSubmit, isDark }: MissionResultFormProps) {
  const [formData, setFormData] = useState({ code: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ code: '', description: '' });
  };

  const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
          Code <span className="text-red-500">*</span>
        </Label>
        <Input
          required
          maxLength={50}
          placeholder="e.g., SUCCESS"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          className={`uppercase ${inputClass}`}
        />
      </div>

      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          required
          maxLength={255}
          rows={3}
          placeholder="e.g., Mission completed successfully"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={inputClass}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 mt-2"
      >
        Add Result
      </Button>
    </form>
  );
}