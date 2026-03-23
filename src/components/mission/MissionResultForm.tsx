'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MissionResult } from '@/config/types/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface MissionResultFormProps {
  onSubmit: (result: Omit<MissionResult, 'id'>) => Promise<void>;
  isDark: boolean;
  initialData?: Omit<MissionResult, 'id'>;
  mode?: 'add' | 'edit';
}

export default function MissionResultForm({ onSubmit, isDark, initialData, mode = 'add' }: MissionResultFormProps) {
  const [formData, setFormData] = useState({ code: initialData?.code ?? '', description: initialData?.description ?? '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (mode === 'add') setFormData({ code: '', description: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Code <span className="text-red-500">*</span></Label>
        <Input required maxLength={50} placeholder="e.g., SUCCESS" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className={`uppercase ${inputClass}`} disabled={isSubmitting} />
      </div>
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>Description <span className="text-red-500">*</span></Label>
        <Textarea required maxLength={255} rows={3} placeholder="e.g., Mission completed successfully" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClass} disabled={isSubmitting} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold mt-2 gap-2">
        {isSubmitting ? (
          <><Loader2 size={14} className="animate-spin" />{mode === 'edit' ? 'Saving...' : 'Adding...'}</>
        ) : (
          mode === 'edit' ? 'Save Changes' : 'Add Result'
        )}
      </Button>
    </form>
  );
}
