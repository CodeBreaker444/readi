'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RotateCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FilterState {
  search: string;
  statusFilter: string;
  pilotFilter: string;
  dateStart: string;
  dateEnd: string;
}

interface Pilot {
  user_id: number;
  first_name: string;
  last_name: string;
}

interface OperationsFiltersProps {
  isDark: boolean;
  loading: boolean;
  filters: FilterState;
  pilots: Pilot[];
  operationsCount: number;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function OperationsFilters({
  isDark,
  loading,
  filters,
  pilots,
  operationsCount,
  onFilterChange,
  onReset,
}: OperationsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`border-b px-6 py-4 ${
        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mx-auto space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('operations.table.filters.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="pl-8"
            />
          </div>

          <Select
            value={filters.statusFilter}
            onValueChange={(v) => onFilterChange({ ...filters, statusFilter: v })}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t('operations.table.filters.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('operations.table.filters.allStatuses')}</SelectItem>
              <SelectItem value="PLANNED">{t('operations.table.status.planned')}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t('operations.table.status.inProgress')}</SelectItem>
              <SelectItem value="COMPLETED">{t('operations.table.status.completed')}</SelectItem>
              <SelectItem value="CANCELLED">{t('operations.table.status.cancelled')}</SelectItem>
              <SelectItem value="ABORTED">{t('operations.table.status.aborted')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.pilotFilter}
            onValueChange={(v) => onFilterChange({ ...filters, pilotFilter: v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t('operations.table.filters.allPilots')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('operations.table.filters.allPilots')}</SelectItem>
              {pilots.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id.toString()}>
                  {p.first_name} {p.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filters.dateStart}
            onChange={(e) => onFilterChange({ ...filters, dateStart: e.target.value })}
            className="w-36 text-sm"
          />
          <Input
            type="date"
            value={filters.dateEnd}
            onChange={(e) => onFilterChange({ ...filters, dateEnd: e.target.value })}
            className="w-36 text-sm"
          />

          <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            {t('operations.table.filters.reset')}
          </Button>

          <span className="ml-auto text-sm text-muted-foreground">
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              t('operations.table.counter', { count: operationsCount })
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
