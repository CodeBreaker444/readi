'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FlightRequestsHeaderProps {
  isDark: boolean;
  filterStatus: string;
  statuses: string[];
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
}

export function FlightRequestsHeader({
  isDark,
  filterStatus,
  statuses,
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
          <Select value={filterStatus} onValueChange={onFilterChange}>
            <SelectTrigger className={`h-8 text-xs w-36 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`planning.flightRequests.statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
