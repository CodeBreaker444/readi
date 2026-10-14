'use client';

import '@/lib/i18n/config';
import {
  EMPTY_EVENT_FILTERS,
  EventFilterPanel,
  FILTER_ALL,
  type EventFilters,
} from '@/components/logbook/event/EventFilterPanel';
import { EventLogbookTable } from '@/components/logbook/event/EventLogbookTable';
import { eventUi } from '@/components/logbook/event/event-ui';
import { useTheme } from '@/components/useTheme';
import type { EventLogbookItem } from '@/config/types/event-logbook';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function ClientEventsPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const ui = eventUi(isDark);

  const [filters, setFilters] = useState<EventFilters>(EMPTY_EVENT_FILTERS);
  const [data, setData] = useState<EventLogbookItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(
    async (f: EventFilters) => {
      setLoading(true);
      try {
        const res = await axios.post('/api/client-portal/events', {
          event_type: f.type === FILTER_ALL ? undefined : f.type,
          date_start: f.from ? new Date(`${f.from}T00:00:00`).toISOString() : undefined,
          date_end: f.to ? new Date(`${f.to}T23:59:59.999`).toISOString() : undefined,
        });
        setData(res.data.data ?? []);
      } catch (err: any) {
        toast.error(err?.response?.data?.error ?? t('logbooks.eventLogbook.loadError'));
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    fetchData(EMPTY_EVENT_FILTERS);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div
        className={cn(
          'top-0 z-10 mb-6 px-4 py-4 backdrop-blur-md transition-colors sm:px-6',
          isDark ? 'border-b border-slate-800 bg-slate-900/80 text-white' : 'border-b border-slate-200 bg-white/80 text-slate-900',
        )}
      >
        <div className="mx-auto flex max-w-[1800px] items-center gap-3">
          <div className="h-6 w-1 shrink-0 rounded-full bg-violet-600" />
          <div>
            <h1 className="text-base font-semibold tracking-tight">{t('logbooks.eventLogbook.title')}</h1>
            <p className={cn('text-xs', ui.faint)}>{t('logbooks.eventLogbook.clientSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 pb-8 sm:px-6">
        <EventFilterPanel
          filters={filters}
          onChange={setFilters}
          onSearch={() => fetchData(filters)}
          onReset={() => {
            setFilters(EMPTY_EVENT_FILTERS);
            fetchData(EMPTY_EVENT_FILTERS);
          }}
          isDark={isDark}
        />
        <EventLogbookTable
          data={data}
          loading={loading}
          showPilot={false}
          isDark={isDark}
          attachmentsUrl={(id) => `/api/client-portal/events/${id}/attachments`}
        />
      </div>
    </div>
  );
}
