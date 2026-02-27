'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MissionCategory } from '@/config/types/types';
import { useState } from 'react';

interface MissionCategoryFormProps {
  onSubmit: (category: Omit<MissionCategory, 'id'>) => void;
  isDark: boolean;
}

export default function MissionCategoryForm({ onSubmit, isDark }: MissionCategoryFormProps) {
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ code: '', name: '', description: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>
          Category Code <span className="text-red-500">*</span>
        </Label>
        <Input
          required
          maxLength={50}
          placeholder="e.g., COMMERCIAL"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          className={isDark ? 'bg-slate-900 border-slate-600 text-white' : ''}
        />
      </div>

      <div className="space-y-1.5">
        <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>
          Category Name <span className="text-red-500">*</span>
        </Label>
        <Input
          required
          maxLength={100}
          placeholder="e.g., Commercial"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={isDark ? 'bg-slate-900 border-slate-600 text-white' : ''}
        />
      </div>

      <div className="space-y-1.5">
        <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>Description</Label>
        <Textarea
          rows={3}
          placeholder="e.g., Commercial client work"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={isDark ? 'bg-slate-900 border-slate-600 text-white' : ''}
        />
      </div>

      <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white">
        Add Category
      </Button>
    </form>
  );
}