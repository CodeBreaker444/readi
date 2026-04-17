'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Evaluation, EvaluationResult, EvaluationStatus } from '@/config/types/evaluation';
import axios from 'axios';
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  evaluation: Evaluation | null;
  onUpdated?: (ev: Evaluation) => void;
}

export function EditEvaluationForm({ evaluation, onUpdated }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    evaluation_request_date: '',
    evaluation_year: '',
    evaluation_desc: '',
    evaluation_offer: '',
    evaluation_sale_manager: '',
    evaluation_status: 'NEW' as EvaluationStatus,
    evaluation_result: 'PROCESSING' as EvaluationResult,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!evaluation) return;
    setForm({
      evaluation_request_date: evaluation.evaluation_request_date ?? '',
      evaluation_year: String(evaluation.evaluation_year ?? ''),
      evaluation_desc: evaluation.evaluation_desc ?? '',
      evaluation_offer: evaluation.evaluation_offer ?? '',
      evaluation_sale_manager: evaluation.evaluation_sale_manager ?? '',
      evaluation_status: evaluation.evaluation_status ?? 'NEW',
      evaluation_result: evaluation.evaluation_result ?? 'PROCESSING',
    });
  }, [evaluation]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!evaluation) return;

    try {
      setIsSaving(true);
      await axios.put(`/api/evaluation/${evaluation.evaluation_id}`, {
        evaluation_id: evaluation.evaluation_id,
        fk_owner_id: evaluation.fk_owner_id,
        fk_client_id: evaluation.fk_client_id,
        fk_evaluation_code: evaluation.fk_evaluation_code,
        evaluation_folder: evaluation.evaluation_folder,
        ...form,
        evaluation_year: Number(form.evaluation_year),
      });
      toast.success(t('planning.evaluation.updated'));
      onUpdated?.({ ...evaluation, ...form, evaluation_year: Number(form.evaluation_year) });
    } catch {
      toast.error(t('planning.evaluation.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!evaluation) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.client')}</Label>
          <Input
            value={evaluation.client_name ?? ''}
            disabled
            className="h-8 text-sm bg-slate-50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.requestDate')}</Label>
          <Input
            value={form.evaluation_request_date}
            onChange={(e) => handleChange('evaluation_request_date', e.target.value)}
            placeholder="DD/MM/YYYY"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.yearReference')}</Label>
          <Input
            value={form.evaluation_year}
            onChange={(e) => handleChange('evaluation_year', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.description')}</Label>
          <Input
            value={form.evaluation_desc}
            onChange={(e) => handleChange('evaluation_desc', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.offerRef')}</Label>
          <Input
            value={form.evaluation_offer}
            onChange={(e) => handleChange('evaluation_offer', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.salesManager')}</Label>
          <Input
            value={form.evaluation_sale_manager}
            onChange={(e) => handleChange('evaluation_sale_manager', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.status')}</Label>
          <Select
            value={form.evaluation_status}
            onValueChange={(v) => handleChange('evaluation_status', v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">{t('planning.status.newTask')}</SelectItem>
              <SelectItem value="PROGRESS">{t('planning.status.inProgress')}</SelectItem>
              <SelectItem value="REVIEW">{t('planning.status.feedbackRequest')}</SelectItem>
              <SelectItem value="SUSPENDED">{t('planning.status.suspended')}</SelectItem>
              <SelectItem value="COMPLETED">{t('planning.status.done')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">{t('planning.form.result')}</Label>
          <Select
            value={form.evaluation_result}
            onValueChange={(v) => handleChange('evaluation_result', v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PROCESSING">{t('planning.status.processing')}</SelectItem>
              <SelectItem value="RESULT_POSITIVE">{t('planning.status.completedPositive')}</SelectItem>
              <SelectItem value="RESULT_NEGATIVE">{t('planning.status.completedRefused')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" size="sm" disabled={isSaving} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t('planning.actions.update')}
        </Button>
      </div>
    </form>
  );
}