'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MissionType } from '@/config/types/types';
import { Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface MissionTypeFormProps {
  onSubmit: (data: Omit<MissionType, 'id'>) => Promise<void>;
  isDark: boolean;
  initialData?: Omit<MissionType, 'id'>;
  mode?: 'add' | 'edit';
}

export default function MissionTypeForm({ onSubmit, isDark, initialData, mode = 'add' }: MissionTypeFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: initialData?.name ?? '', description: initialData?.description ?? '', code: initialData?.code ?? '', label: initialData?.label ?? '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.code || !formData.label) { toast.error(t('missionType.form.fillAllFields')); return; }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (mode === 'add') setFormData({ name: '', description: '', code: '', label: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionType.form.nameLabel')} <span className="text-red-500">*</span></Label>
        <Input placeholder={t('missionType.form.namePlaceholder')} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className={inputClass} disabled={isSubmitting} />
      </div>
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionType.form.descriptionLabel')} <span className="text-red-500">*</span></Label>
        <Input placeholder={t('missionType.form.descriptionPlaceholder')} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required className={inputClass} disabled={isSubmitting} />
      </div>
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionType.form.codeLabel')} <span className="text-red-500">*</span></Label>
        <Input placeholder={t('missionType.form.codePlaceholder')} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required className={`uppercase ${inputClass}`} disabled={isSubmitting} />
      </div>
      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionType.form.labelLabel')} <span className="text-red-500">*</span></Label>
        <Input placeholder={t('missionType.form.labelPlaceholder')} value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} required className={inputClass} disabled={isSubmitting} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold cursor-pointer mt-2 gap-2">
        {isSubmitting ? (
          <><Loader2 size={14} className="animate-spin" />{mode === 'edit' ? t('missionType.form.saving') : t('missionType.form.adding')}</>
        ) : (
          mode === 'edit' ? t('missionType.form.saveChanges') : t('missionType.form.addButton')
        )}
      </Button>
    </form>
  );
}
