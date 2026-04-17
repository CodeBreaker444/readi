'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Trash2, Wand2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Pilot {
  user_id: number;
  first_name: string;
  last_name: string;
}

interface OperationsBatchBarProps {
  isDark: boolean;
  selectedCount: number;
  pilots: Pilot[];
  batchDeleting: boolean;
  batchUpdating: boolean;
  batchSettingPilot: boolean;
  batchAutofilling: boolean;
  onBatchDelete: () => void;
  onBatchStatus: (status: string) => void;
  onBatchSetPilot: (pilotId: string) => void;
  onBatchAutofill: () => void;
  onClearSelection: () => void;
}

export function OperationsBatchBar({
  isDark,
  selectedCount,
  pilots,
  batchDeleting,
  batchUpdating,
  batchSettingPilot,
  batchAutofilling,
  onBatchDelete,
  onBatchStatus,
  onBatchSetPilot,
  onClearSelection,
  onBatchAutofill,
}: OperationsBatchBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'mx-6 mt-4 flex items-center gap-2 rounded-lg border px-4 py-2.5',
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-violet-50 border-violet-200'
      )}
    >
      <span className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-violet-800')}>
        {t('operations.table.batch.selected', { count: selectedCount })}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Select onValueChange={onBatchSetPilot} disabled={batchSettingPilot}>
          <SelectTrigger
            className={cn('h-8 w-44 text-xs', isDark ? 'border-slate-600 bg-slate-700' : '')}
          >
            <SelectValue
              placeholder={
                batchSettingPilot
                  ? t('operations.table.batch.settingPilot')
                  : t('operations.table.batch.setPilot')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {pilots.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id.toString()}>
                {p.first_name} {p.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          disabled={batchAutofilling}
          onClick={onBatchAutofill}
          className={cn(
            'h-8 gap-1.5 text-xs',
            isDark
              ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
          {batchAutofilling
            ? t('operations.table.batch.autofilling')
            : t('operations.table.batch.autofillTasks')}
        </Button>

        <Select onValueChange={onBatchStatus} disabled={batchUpdating}>
          <SelectTrigger
            className={cn('h-8 w-44 text-xs', isDark ? 'border-slate-600 bg-slate-700' : '')}
          >
            <SelectValue
              placeholder={
                batchUpdating
                  ? t('operations.table.batch.updating')
                  : t('operations.table.batch.changeStatus')
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PLANNED">{t('operations.table.batch.setPlanned')}</SelectItem>
            <SelectItem value="IN_PROGRESS">{t('operations.table.batch.setInProgress')}</SelectItem>
            <SelectItem value="COMPLETED">{t('operations.table.batch.setCompleted')}</SelectItem>
            <SelectItem value="CANCELLED">{t('operations.table.batch.setCancelled')}</SelectItem>
            <SelectItem value="ABORTED">{t('operations.table.batch.setAborted')}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          disabled={batchDeleting}
          onClick={onBatchDelete}
          className="h-8 gap-1.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {batchDeleting
            ? t('operations.table.batch.deleting')
            : t('operations.table.batch.deleteSelected')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="h-8 w-8 p-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
