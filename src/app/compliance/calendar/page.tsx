'use client';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/useTheme';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import axios from 'axios';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';


interface ComplianceCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  extendedProps: {
    requirement_code: string;
    requirement_status: string;
    requirement_type: string | null;
    regulatory_body: string | null;
  };
}

interface EventDetailProps {
  event: ComplianceCalendarEvent;
  isDark: boolean;
  onClose: () => void;
}



function EventDetail({ event, isDark, onClose }: EventDetailProps) {

  const { t } = useTranslation();
  const bg = isDark ? 'bg-[#0f1320] border-white/10' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';

  const STATUS_LABEL: Record<string, string> = {
    COMPLIANT: 'Compliant',
    PARTIAL: 'Partial',
    NON_COMPLIANT: 'Non-Compliant',
    NOT_APPLICABLE: 'Not Applicable',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className={`w-full max-w-sm rounded-xl border shadow-2xl ${bg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-1.5 rounded-t-xl"
          style={{ backgroundColor: event.color }}
        />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[11px] font-mono mb-1 ${textMuted}`}>{event.extendedProps.requirement_code}</p>
              <h3 className={`text-sm font-semibold leading-snug ${textPrimary}`}>{event.title.replace(`[${event.extendedProps.requirement_code}] `, '')}</h3>
            </div>
            <button
              onClick={onClose}
              className={`text-xs px-2 py-1 rounded-md ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/6' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] ${textMuted}`}>{t('compliance.calendar.eventModal.fields.status')}</span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${event.color}20`, color: event.color }}
              >
                {t(`compliance.shared.status.${event.extendedProps.requirement_status}`) || event.extendedProps.requirement_status}
              </span>
            </div>
            {event.extendedProps.requirement_type && (
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${textMuted}`}>{t('compliance.calendar.eventModal.fields.area')}</span>
                <span className={`text-[11px] font-medium ${textPrimary}`}>{event.extendedProps.requirement_type}</span>
              </div>
            )}
            {event.extendedProps.regulatory_body && (
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${textMuted}`}>{t('compliance.calendar.eventModal.fields.source')}</span>
                <span className={`text-[11px] ${textMuted}`}>{event.extendedProps.regulatory_body}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] ${textMuted}`}>{t('compliance.calendar.eventModal.fields.dueDate')}</span>
              <span className={`text-[11px] font-medium tabular-nums ${textPrimary}`}>{event.start}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function ComplianceCalendarPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<ComplianceCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ComplianceCalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/compliance/calendar');
      if (res.data.code === 1) setEvents(res.data.data ?? []);
      else toast.error(res.data.error || t('compliance.calendar.messages.loadFailed'));
    } catch {
      toast.error(t('compliance.calendar.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color,
    borderColor: 'transparent',
    textColor: '#fff',
    extendedProps: e.extendedProps,
  }));

  function handleEventClick(clickInfo: { event: { id: string; title: string; start: Date | null; backgroundColor: string; extendedProps: Record<string, unknown> } }) {
    const ev = events.find((e) => e.id === clickInfo.event.id);
    if (ev) setSelectedEvent(ev);
  }

  const STATUS_LEGEND = [
    { label: t('compliance.calendar.legend.compliant'), color: '#10b981' },
    { label: t('compliance.calendar.legend.partial'), color: '#f59e0b' },
    { label: t('compliance.calendar.legend.nonCompliant'), color: '#ef4444' },
    { label: t('compliance.calendar.legend.notApplicable'), color: '#6b7280' },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark ? 'bg-slate-900/80 border-b border-slate-800' : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'} px-6 py-4`}>
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('compliance.calendar.title')}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                 {t('compliance.calendar.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3 flex-wrap">
              {STATUS_LEGEND.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                </div>
              ))}
            </div>

            <div className={`flex items-center gap-2 border-l pl-3 sm:pl-6 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <Button
                size="sm"
                onClick={fetchEvents}
                disabled={loading}
                className={`h-8 gap-1.5 text-xs font-semibold shadow-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-white hover:bg-gray-50 text-slate-700 border border-slate-200'}`}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                {t('compliance.requirementsEvidences.actions.refresh')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

          <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${isDark ? 'bg-slate-700/50 border-slate-700' : 'bg-gradient-to-r from-violet-50 to-purple-50 border-gray-100'}`}>
            <CalendarDays size={15} className={isDark ? 'text-slate-400' : 'text-violet-400'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
              {t('compliance.generalAuditPlan.auditSchedule.sectionTitle')}
            </span>
            {loading && (
              <span className={`ml-auto text-[11px] animate-pulse font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {t('compliance.calendar.loading')}
              </span>
            )}
            {!loading && (
              <span className={`ml-auto text-[11px] font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {t('compliance.calendar.eventCount', { count: events.length })}
              </span>
            )}
          </div>

          {loading ? (
            <div className={`p-4 md:p-6 animate-pulse ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`h-8 w-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <div className={`h-6 w-52 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className="flex items-center gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`h-8 w-16 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={`h-20 border-b last:border-0 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white'}`} />
                ))}
              </div>
            </div>
          ) : (
            <div className={`p-4 md:p-6 ${isDark ? 'fc-dark' : 'fc-light'}`}>
              <style>{`
                .fc-event {
                  cursor: pointer;
                  border-radius: 6px !important;
                  font-size: 11.5px !important;
                  font-weight: 600 !important;
                  padding: 1px 5px !important;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
                  transition: filter 0.15s, transform 0.15s !important;
                }
                .fc-event:hover { filter: brightness(1.12); transform: translateY(-1px); }
                .fc-toolbar { flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem !important; }
                .fc-button {
                  border-radius: 8px !important;
                  font-size: 12px !important;
                  font-weight: 600 !important;
                  padding: 5px 12px !important;
                  text-transform: capitalize !important;
                  transition: all 0.15s !important;
                  letter-spacing: 0.02em !important;
                }
                .fc-toolbar-title {
                  font-size: 1.1rem !important;
                  font-weight: 700 !important;
                  letter-spacing: -0.02em !important;
                }
                .fc-col-header-cell-cushion,
                .fc-daygrid-day-number,
                .fc-list-day-text,
                .fc-list-day-side-text { text-decoration: none !important; }

                .fc-light .fc-toolbar-title { color: #1e293b; }
                .fc-light .fc-button { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #475569 !important; }
                .fc-light .fc-button:hover { background: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #1e293b !important; }
                .fc-light .fc-button-active,
                .fc-light .fc-button-primary:not(:disabled).fc-button-active { background: #7c3aed !important; border-color: #7c3aed !important; color: #fff !important; }
                .fc-light .fc-today-button { background: #ede9fe !important; border-color: #ddd6fe !important; color: #7c3aed !important; }
                .fc-light .fc-col-header-cell-cushion { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
                .fc-light .fc-daygrid-day-number { color: #64748b; font-size: 12px; font-weight: 600; }
                .fc-light .fc-scrollgrid { border-color: #e2e8f0 !important; }
                .fc-light .fc-scrollgrid-section > td { border-color: #e2e8f0 !important; }
                .fc-light .fc-col-header-cell { border-color: #e2e8f0 !important; background: #f8fafc; }
                .fc-light .fc-daygrid-day { border-color: #f1f5f9 !important; }
                .fc-light .fc-day-today { background: #faf5ff !important; }
                .fc-light .fc-list-day-cushion { background: #f8fafc; }
                .fc-light .fc-list-day-text,
                .fc-light .fc-list-day-side-text { color: #475569; font-weight: 700; font-size: 12px; }
                .fc-light .fc-list-event-title { color: #1e293b; }
                .fc-light .fc-list-event-time { color: #94a3b8; font-size: 11px; }
                .fc-light .fc-list-table td { border-color: #f1f5f9; }

                .fc-dark .fc-toolbar-title { color: #f1f5f9; }
                .fc-dark .fc-button { background: #1e293b !important; border: 1px solid #334155 !important; color: #94a3b8 !important; }
                .fc-dark .fc-button:hover { background: #334155 !important; border-color: #475569 !important; color: #f1f5f9 !important; }
                .fc-dark .fc-button-active,
                .fc-dark .fc-button-primary:not(:disabled).fc-button-active { background: #7c3aed !important; border-color: #7c3aed !important; color: #fff !important; }
                .fc-dark .fc-today-button { background: #2e1065 !important; border-color: #4c1d95 !important; color: #c4b5fd !important; }
                .fc-dark .fc-col-header-cell-cushion { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
                .fc-dark .fc-daygrid-day-number { color: #64748b; font-size: 12px; font-weight: 600; }
                .fc-dark .fc-scrollgrid { border-color: #1e293b !important; }
                .fc-dark .fc-scrollgrid-section > td { border-color: #1e293b !important; }
                .fc-dark .fc-col-header-cell { border-color: #1e293b !important; background: #0f172a; }
                .fc-dark .fc-daygrid-day { border-color: #1e293b !important; }
                .fc-dark .fc-day-today { background: #2e1065 !important; }
                .fc-dark .fc-list-day-cushion { background: #0f172a; }
                .fc-dark .fc-list-day-text,
                .fc-dark .fc-list-day-side-text { color: #64748b; font-weight: 700; font-size: 12px; }
                .fc-dark .fc-list-event-title { color: #e2e8f0; }
                .fc-dark .fc-list-event-time { color: #475569; font-size: 11px; }
                .fc-dark .fc-list-table td { border-color: #1e293b; }
                .fc-dark .fc-theme-standard td,
                .fc-dark .fc-theme-standard th { border-color: #1e293b; }
              `}</style>

              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, listPlugin, interactionPlugin, timeGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,listMonth',
                }}
                buttonText={{
                  today: t('compliance.calendar.buttonText.today'),
                  month: t('compliance.calendar.buttonText.month'),
                  list: t('compliance.calendar.buttonText.list'),
                }}
                events={fcEvents}
                eventClick={handleEventClick}
                editable={false}
                selectable={false}
                height="auto"
                dayMaxEvents={4}
                nowIndicator={true}
                noEventsContent={t('compliance.calendar.empty')}
              />
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          isDark={isDark}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
