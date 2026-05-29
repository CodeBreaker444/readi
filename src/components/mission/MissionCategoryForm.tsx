'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MissionCategory } from '@/config/types/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MissionCategoryFormProps {
  onSubmit: (category: Omit<MissionCategory, 'id'>) => Promise<void>;
  isDark: boolean;
  initialData?: Omit<MissionCategory, 'id'>;
  mode?: 'add' | 'edit';
}

export default function MissionCategoryForm({ onSubmit, isDark, initialData, mode = 'add' }: MissionCategoryFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ code: initialData?.code ?? '', name: initialData?.name ?? '', description: initialData?.description ?? '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (mode === 'add') setFormData({ code: '', name: '', description: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionCategory.form.codeLabel')} <span className="text-red-500">*</span></Label>
        <Input required maxLength={50} placeholder={t('missionCategory.form.codePlaceholder')} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className={`uppercase ${inputClass}`} disabled={isSubmitting} />
      </div>
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionCategory.form.nameLabel')} <span className="text-red-500">*</span></Label>
        <Input required maxLength={100} placeholder={t('missionCategory.form.namePlaceholder')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} disabled={isSubmitting} />
      </div>
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionCategory.form.descriptionLabel')}</Label>
        <Textarea rows={3} placeholder={t('missionCategory.form.descriptionPlaceholder')} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClass} disabled={isSubmitting} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 hover:bg-violet-700 cursor-pointer text-white font-semibold mt-2 gap-2">
        {isSubmitting ? (
          <><Loader2 size={14} className="animate-spin" />{mode === 'edit' ? t('missionCategory.form.saving') : t('missionCategory.form.adding')}</>
        ) : (
          mode === 'edit' ? t('missionCategory.form.saveChanges') : t('missionCategory.form.addButton')
        )}
      </Button>
    </form>
  );
}
