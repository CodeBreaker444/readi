'use client';

import axios from 'axios';
import { AlertCircle, FileCheck } from 'lucide-react';
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
  onClose: () => void;
  onComplete: (data: any) => void;
}

export function ChecklistTaskModal({ open, task, evaluationId, onClose, onComplete }: Props) {

  async function handleSurveyComplete(survey: any) {
    try {
      await axios.post('/api/organization/checklist/result', {
        checklist_data: survey.data,
        checklist_code: task.task_code,
        evaluation_id: evaluationId,
        task_id: task.task_id,
      });
      onComplete(survey.data);
      toast.success('Checklist saved');
    } catch {
      toast.error('Failed to save checklist result');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">

        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
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
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-200 text-emerald-700 bg-emerald-50">
              Checklist
            </span>
          </div>
        </DialogHeader>
        <div className="px-6 py-4">
          {!task.checklist_json ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <AlertCircle className="h-8 w-8" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">Checklist not found</p>
                <p className="text-xs mt-1">
                  No checklist definition exists for code{' '}
                  <span className="font-mono">{task.task_code}</span>.
                </p>
              </div>
            </div>
          ) : (
            <ChecklistRenderer
              checklistJson={task.checklist_json}
              onComplete={handleSurveyComplete}
            />
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}