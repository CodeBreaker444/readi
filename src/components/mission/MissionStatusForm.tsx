'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mission } from '@/config/types/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MissionStatusFormProps {
  onSubmit: (status: Omit<Mission, 'id'>) => Promise<void>;
  isDark: boolean;
  initialData?: Omit<Mission, 'id'>;
  mode?: 'add' | 'edit';
}

export default function MissionStatusForm({ onSubmit, isDark, initialData, mode = 'add' }: MissionStatusFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    code: initialData?.code ?? '',
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    order: initialData?.order ?? 0,
    isFinalStatus: initialData?.isFinalStatus ?? false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (mode === 'add') setFormData({ code: '', name: '', description: '', order: 0, isFinalStatus: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            {t('missionStatus.form.codeLabel')} <span className="text-red-500">*</span>
          </Label>
          <Input
            required
            maxLength={50}
            placeholder={t('missionStatus.form.codePlaceholder')}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className={`uppercase ${inputClass}`}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            {t('missionStatus.form.nameLabel')} <span className="text-red-500">*</span>
          </Label>
          <Input
            required
            maxLength={100}
            placeholder={t('missionStatus.form.namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionStatus.form.descriptionLabel')}</Label>
        <Textarea
          rows={3}
          placeholder={t('missionStatus.form.descriptionPlaceholder')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={inputClass}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('missionStatus.form.orderLabel')}</Label>
          <Input
            type="number"
            min="0"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            className={inputClass}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={formData.isFinalStatus}
              onCheckedChange={(checked: boolean | 'indeterminate') => setFormData({ ...formData, isFinalStatus: !!checked })}
              disabled={isSubmitting}
            />
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('missionStatus.form.finalStatusLabel')}
            </span>
          </label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full cursor-pointer bg-violet-600 hover:bg-violet-700 text-white font-semibold mt-2 gap-2"
      >
        {isSubmitting ? (
          <><Loader2 size={14} className="animate-spin" />{mode === 'edit' ? t('missionStatus.form.saving') : t('missionStatus.form.adding')}</>
        ) : (
          mode === 'edit' ? t('missionStatus.form.saveChanges') : t('missionStatus.form.addButton')
        )}
      </Button>
    </form>
  );
}
