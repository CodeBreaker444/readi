'use client';

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

interface TrainingCalendarEvent {
  id: string;
  title: string;
  start: string;
  color: string;
  training_id: number;
  attendance_id: number;
  user_name: string | null;
  training_name: string;
  completion_status: string | null;
}


export default function TrainingCalendarPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<TrainingCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TrainingCalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/training/calendar');
      if (res.data.code === 1) setEvents(res.data.data);
    } catch (err) {
      console.error('Failed to fetch training calendar', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventClick = (info: any) => {
    const evt = events.find((e) => e.id === info.event.id);
    if (evt) setSelectedEvent(evt);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div
        className={`top-0 z-20 backdrop-blur-xl border-b transition-colors ${
          isDark
            ? 'bg-[#0a0e1a]/90 border-white/[0.06]'
            : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
      >
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
             <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('training.title')}
              </h1>
              <p className={`text-[11px] mt-0.5 tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('training.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className={`h-8 flex items-center gap-1.5 px-3.5 text-xs font-medium rounded-lg border transition-all ${
              isDark
                ? 'border-white/[0.1] hover:bg-white/[0.05] text-white'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
           {t('training.refresh')}
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Legend */}
        <div
          className={`mb-5 rounded-xl border p-4 flex flex-wrap gap-4 ${
            isDark ? 'bg-[#0f1320] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'
          }`}
        >
          <p className={`text-[11px] font-semibold uppercase tracking-wider self-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('training.legend')}
          </p>
          {[
            { color: '#2e7d32', key: 'COMPLETED' },
            { color: '#1976d2', key: 'IN_PROGRESS' },
            { color: '#ef6c00', key: 'ABSENT' },
            { color: '#c62828', key: 'FAILED' },
            { color: '#6a1b9a', key: 'OTHER' },
          ].map(({ color, key }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t(`training.statuses.${key}`)}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div
          className={`rounded-xl border overflow-hidden ${
            isDark ? 'bg-[#0f1320] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'
          }`}
        >
          {loading && events.length === 0 ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <CalendarDays size={32} className={isDark ? 'text-gray-700' : 'text-gray-300'} />
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('training.loading')}
                </p>
              </div>
            </div>
          ) : (
            <div className={`p-4 training-calendar ${isDark ? 'dark' : ''}`}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,listMonth',
                }}
                events={events}
                eventClick={handleEventClick}
                height="auto"
                eventDisplay="block"
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
              />
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border shadow-2xl ${
              isDark ? 'bg-[#0f1320] border-white/[0.08]' : 'bg-white border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${selectedEvent.color}22` }}
              >
                <CalendarDays size={18} style={{ color: selectedEvent.color }} />
              </div>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedEvent.training_name}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('training.participant')}</span>
                  <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {selectedEvent.user_name ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('training.sessionDate')}</span>
                  <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {new Date(selectedEvent.start).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('training.status')}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                    style={{
                      color: selectedEvent.color,
                      borderColor: `${selectedEvent.color}44`,
                      backgroundColor: `${selectedEvent.color}18`,
                    }}
                  >
                    {selectedEvent.completion_status ? t(`training.statuses.${selectedEvent.completion_status}`, selectedEvent.completion_status) : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className={`flex justify-end px-6 py-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
              <button
                onClick={() => setSelectedEvent(null)}
                className={`h-8 px-4 text-xs rounded-lg border transition-colors ${
                  isDark ? 'border-white/[0.08] hover:bg-white/[0.05] text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                {t('training.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .training-calendar .fc {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 0.8rem;
        }
        .training-calendar.dark .fc {
          color: #cbd5e1;
        }
        .training-calendar.dark .fc-theme-standard td,
        .training-calendar.dark .fc-theme-standard th {
          border-color: rgba(255,255,255,0.06);
        }
        .training-calendar.dark .fc-theme-standard .fc-scrollgrid {
          border-color: rgba(255,255,255,0.06);
        }
        .training-calendar.dark .fc-col-header-cell {
          background: rgba(255,255,255,0.02);
        }
        .training-calendar.dark .fc-daygrid-day:hover {
          background: rgba(255,255,255,0.02);
        }
        .training-calendar.dark .fc-button-primary {
          background: #6d28d9;
          border-color: #6d28d9;
        }
        .training-calendar.dark .fc-button-primary:hover {
          background: #5b21b6;
          border-color: #5b21b6;
        }
        .training-calendar.dark .fc-button-primary:not(:disabled).fc-button-active {
          background: #4c1d95;
          border-color: #4c1d95;
        }
        .training-calendar.dark .fc-today-button {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.08);
          color: #cbd5e1;
        }
        .training-calendar.dark .fc-daygrid-day.fc-day-today {
          background: rgba(109,40,217,0.1);
        }
        .training-calendar.dark .fc-list-day-cushion {
          background: rgba(255,255,255,0.04);
        }
        .training-calendar.dark .fc-list-event:hover td {
          background: rgba(255,255,255,0.03);
        }
      `}</style>
    </div>
  );
}
