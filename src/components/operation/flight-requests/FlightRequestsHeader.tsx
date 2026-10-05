'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FlightRequestsHeaderProps {
  isDark: boolean;
  filterStatus: string;
  statuses: string[];
  getStatusLabel: (status: string) => string;
  tab: 'internal' | 'external';
  hideFilter?: boolean;
  onTabChange: (tab: 'internal' | 'external') => void;
  internalPending: number;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
}

export function FlightRequestsHeader({
  isDark,
  filterStatus,
  statuses,
  getStatusLabel,
  tab,
  hideFilter,
  onTabChange,
  internalPending,
  onFilterChange,
  onRefresh,
}: FlightRequestsHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className={`px-6 py-4 border-b ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white/80 border-gray-200'}`}>
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600" />
          <div>
            <h1 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('planning.flightRequests.title')}</h1>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('planning.flightRequests.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('inline-flex rounded-full p-0.5 gap-0.5', isDark ? 'bg-slate-800' : 'bg-gray-100')} role="tablist">
            {(['internal', 'external'] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => onTabChange(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3.5 h-7 text-xs font-medium cursor-pointer transition-colors',
                  tab === key
                    ? 'bg-violet-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {t(`operations.opmApproval.requests.tabs.${key}`)}
                {key === 'internal' && internalPending > 0 && (
                  <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', tab === key ? 'bg-white/25 text-white' : 'bg-amber-500 text-white')}>
                    {internalPending}
                  </span>
                )}
              </button>
            ))}
          </div>
          {!hideFilter && (
          <Select value={filterStatus} onValueChange={onFilterChange}>
            <SelectTrigger className={`h-8 text-xs w-36 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className={`h-8 gap-1.5 text-xs ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : ''}`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t('planning.flightRequests.refresh')}
          </Button>
        </div>
      </div>
    </div>
  );
}
