'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OperationsPageHeaderProps {
  isDark: boolean;
  onCommunication: () => void;
  onImport: () => void;
  onCreate: () => void;
}

export function OperationsPageHeader({
  isDark,
  onCommunication,
  onImport,
  onCreate,
}: OperationsPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`top-0 z-10 backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-slate-900/80 border-b border-slate-800 text-white'
          : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      } px-6 py-4 mb-8`}
    >
      <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600" />
          <div>
            <h1
              className={`font-semibold text-base tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {t('operations.table.title')}
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('operations.table.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={onCommunication}
            className={`h-8 gap-1.5 text-xs ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {t('operations.table.communication')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onImport}
            className={`h-8 gap-1.5 text-xs ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            {t('operations.table.import')}
          </Button>

          <Button
            size="sm"
            onClick={onCreate}
            className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('operations.table.newOperation')}
          </Button>
        </div>
      </div>
    </div>
  );
}
