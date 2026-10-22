'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const EVENT_TYPE_PAGE_SIZE = 8;

interface Props {
  page: number;
  count: number;
  total: number;
  onPage: (page: number) => void;
}

/** Previous / next pager; renders nothing when everything fits on one page. */
export function Pager({ page, count, total, onPage }: Props) {
  const { t } = useTranslation();
  if (total <= EVENT_TYPE_PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={page === 0} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-3.5 w-3.5" />
        {t('operations.newOperation.drone.pagePrevious')}
      </Button>
      <span>{t('operations.newOperation.drone.pageIndicator', { current: page + 1, total: count })}</span>
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={page >= count - 1} onClick={() => onPage(page + 1)}>
        {t('operations.newOperation.drone.pageNext')}
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
