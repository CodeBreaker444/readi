'use client';

import axios from 'axios';
import { AlertCircle, FileCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ChecklistRenderer } from '@/components/checklist/ChecklistRenderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EvaluationTask } from '@/config/types/evaluation';

interface Props {
  open: boolean;
  task: EvaluationTask;
  evaluationId?: number;
  planningId?: number;
  onClose: () => void;
  onComplete: (data: any) => void;
}

export function ChecklistTaskModal({ open, task, evaluationId, planningId, onClose, onComplete }: Props) {
  const { t } = useTranslation();

  async function handleSurveyComplete(survey: any) {
    try {
      if (planningId) {
        await axios.put(`/api/evaluation/planning/${planningId}/tasks`, {
          task_id: task.task_id,
          task_status: 'completed',
          checklist_result: survey.data,
        });
      } else {
        await axios.post('/api/organization/checklist/result', {
          checklist_data: survey.data,
          checklist_code: task.task_code,
          evaluation_id: evaluationId,
          task_id: task.task_id,
        });
      }
      onComplete(survey.data);
      toast.success(t('planning.evaluation.savedSuccess'));
    } catch {
      toast.error(t('planning.evaluation.saveFailed'));
    }
  }

  const isViewMode = task.task_status === 'completed' || task.task_status === 'skipped';
  const initialData = isViewMode ? (task.checklist_result || {}) : {};

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl md:max-w-6xl lg:max-w-7xl xl:max-w-8xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
              <FileCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-semibold text-slate-800 leading-snug">
                {task.task_name}
              </DialogTitle>
              <p className="mt-0.5 font-mono text-xs text-slate-400">{task.task_code}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="px-4 sm:px-6 py-4 w-full overflow-x-auto">
          {!task.checklist_json ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <AlertCircle className="h-8 w-8" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">{t('planning.evaluation.checklistNotFound')}</p>
                <p className="text-xs mt-1">
                  {t('planning.evaluation.noChecklistDef')}{' '}
                  <span className="font-mono">{task.task_code}</span>.
                </p>
              </div>
            </div>
          ) : (
            <ChecklistRenderer
              checklistJson={task.checklist_json}
              onComplete={handleSurveyComplete}
              initialData={initialData}
              readOnly={isViewMode}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}