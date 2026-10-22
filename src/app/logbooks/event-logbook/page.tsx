'use client';

import '@/lib/i18n/config';
import { AddEventWizard } from '@/components/logbook/event/AddEventWizard';
import {
  EMPTY_EVENT_FILTERS,
  EventFilterPanel,
  FILTER_ALL,
  type EventFilters,
} from '@/components/logbook/event/EventFilterPanel';
import { EventDetailDialog } from '@/components/logbook/event/EventDetailDialog';
import { EventLogbookTable } from '@/components/logbook/event/EventLogbookTable';
import { useEventDeepLink } from '@/components/logbook/event/useEventDeepLink';
import { EventNotificationSettings } from '@/components/logbook/event/EventNotificationSettings';
import { EventTypeSettings } from '@/components/logbook/event/EventTypeSettings';
import { EventWebhookSettings } from '@/components/logbook/event/EventWebhookSettings';
import { eventUi } from '@/components/logbook/event/event-ui';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/useTheme';
import type { EventDroneOption, EventLogbookItem, EventMissionOption, EventNotifyContact } from '@/config/types/event-logbook';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Loader2, Mail, Plus, RefreshCw, Settings, SlidersHorizontal, Tags } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Defined once so the dialog does not reload the event on every render.
const staffDetailUrl = (id: number) => `/api/logbooks/event/${id}`;

export default function EventLogbookPage() {
  const { isDark } = useTheme();
  const { eventId, open: openEvent, close: closeEvent } = useEventDeepLink();
  const { t } = useTranslation();
  const ui = eventUi(isDark);
  const e = (key: string) => t(`logbooks.eventLogbook.${key}`);

  const [drones, setDrones] = useState<EventDroneOption[]>([]);
  const [missions, setMissions] = useState<EventMissionOption[]>([]);
  const [contacts, setContacts] = useState<EventNotifyContact[]>([]);
  const [defaultContacts, setDefaultContacts] = useState<Record<number, number[]>>({});
  const [canReport, setCanReport] = useState(false);
  const [canConfigure, setCanConfigure] = useState(false);
  const [scoped, setScoped] = useState(true);

  const [filters, setFilters] = useState<EventFilters>(EMPTY_EVENT_FILTERS);
  const [data, setData] = useState<EventLogbookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'event' | 'setup'>('event');
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const fetchData = useCallback(
    async (f: EventFilters) => {
      setLoading(true);
      try {
        const res = await axios.post('/api/logbooks/event/list', {
          tool_id: f.tool === FILTER_ALL ? undefined : Number(f.tool),
          mission_id: f.mission === FILTER_ALL ? undefined : Number(f.mission),
          event_type_id: f.type === FILTER_ALL ? undefined : Number(f.type),
          // Day boundaries in the user's own timezone.
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

  const fetchOptions = useCallback(async () => {
    try {
      const res = await axios.get('/api/logbooks/event/options');
      setDrones(res.data.drones ?? []);
      setMissions(res.data.missions ?? []);
      setContacts(res.data.contacts ?? []);
      setDefaultContacts(res.data.default_contacts ?? {});
      setCanReport(!!res.data.can_report);
      setCanConfigure(!!res.data.can_configure_webhooks);
      setScoped(!!res.data.scoped);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('logbooks.eventLogbook.loadError'));
    }
  }, [t]);

  useEffect(() => {
    fetchOptions();
    fetchData(EMPTY_EVENT_FILTERS);
  }, []);

  const search = () => fetchData(filters);
  const reset = () => {
    setFilters(EMPTY_EVENT_FILTERS);
    fetchData(EMPTY_EVENT_FILTERS);
  };

  return (
    <div className={cn('min-h-screen font-sans transition-colors', isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-gray-900')}>
      <div
        className={cn(
          'px-6 py-4 backdrop-blur-md',
          isDark ? 'border-b border-slate-800 bg-slate-900/80' : 'border-b border-slate-200 bg-white/80',
        )}
      >
        <div className="mx-auto flex max-w-[1800px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-violet-600" />
            <div>
              <h1 className="text-base font-semibold tracking-tight">{e('title')}</h1>
              <p className={cn('text-xs', ui.faint)}>{e('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canConfigure && (
              <Button
                variant="outline"
                size="icon"
                className={cn('h-8 w-8', ui.outlineBtn)}
                title={e('eventTypeSettings')}
                onClick={() => setTypesOpen(true)}
              >
                <Tags className="h-4 w-4" />
              </Button>
            )}
            {canConfigure && (
              <Button
                variant="outline"
                size="icon"
                className={cn('h-8 w-8', ui.outlineBtn)}
                title={e('emailSettings')}
                onClick={() => setNotificationsOpen(true)}
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            {canConfigure && (
              <Button
                variant="outline"
                size="icon"
                className={cn('h-8 w-8', ui.outlineBtn)}
                title={e('webhookSettings')}
                onClick={() => setWebhooksOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" className={cn('h-8 gap-1.5 text-xs', ui.outlineBtn)} disabled={loading} onClick={search}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {e('refresh')}
            </Button>
            {canReport && (
              <Button
                variant="outline"
                size="sm"
                className={cn('h-8 gap-1.5 text-xs', ui.outlineBtn)}
                onClick={() => {
                  setWizardMode('setup');
                  setWizardOpen(true);
                }}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t('logbooks.eventLogbook.wizard.setupTitle')}
              </Button>
            )}
            {canReport && (
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-violet-600 text-xs text-white hover:bg-violet-700"
                onClick={() => {
                  setWizardMode('event');
                  setWizardOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {e('addEvent')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] space-y-4 px-6 py-5">
        <EventFilterPanel
          filters={filters}
          onChange={setFilters}
          onSearch={search}
          onReset={reset}
          isDark={isDark}
          drones={drones}
          missions={missions}
        />
        <EventLogbookTable data={data} loading={loading} showPilot={!scoped} isDark={isDark} highlightId={highlightId} onView={openEvent} canAddMedia={canReport} onMediaAdded={() => fetchData(filters)} />
      </div>

      <EventDetailDialog eventId={eventId} onClose={closeEvent} onChanged={() => fetchData(filters)} isDark={isDark} detailUrl={staffDetailUrl} canAddMedia={canReport} />

      <AddEventWizard
        open={wizardOpen}
        mode={wizardMode}
        onOpenChange={setWizardOpen}
        drones={drones}
        missions={missions}
        contacts={contacts}
        defaultContacts={defaultContacts}
        isDark={isDark}
        onCreated={(eventId) => {
          setFilters(EMPTY_EVENT_FILTERS);
          fetchData(EMPTY_EVENT_FILTERS);
          // The new row is highlighted once the refreshed list arrives.
          setHighlightId(eventId);
        }}
      />

      {canConfigure && <EventWebhookSettings open={webhooksOpen} onOpenChange={setWebhooksOpen} />}
      {canConfigure && (
        <EventTypeSettings
          open={typesOpen}
          isDark={isDark}
          onOpenChange={(v) => {
            setTypesOpen(v);
            // Renames change the labels shown in the list.
            if (!v) fetchData(filters);
          }}
        />
      )}
      {canConfigure && <EventNotificationSettings
          open={notificationsOpen}
          onOpenChange={(v) => {
            setNotificationsOpen(v);
            // Contacts/defaults may have changed; refresh what the report wizard pre-selects.
            if (!v) fetchOptions();
          }}
        />}
    </div>
  );
}
