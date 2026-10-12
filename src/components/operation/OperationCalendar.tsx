'use client'

import { Button } from '@/components/ui/button'
import { OperationCalendarEvent, OperationItem } from '@/config/types/operation'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import axios from 'axios'
import { CalendarDays, CloudSun, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../useTheme'
import { BestTimeToFly } from './btf/BestTimeToFly'
import { FC_CALENDAR_CSS } from './calendar-styles'
import { NewOperationModal } from './NewOperationModal'

export function OperationCalendar() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const calendarRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<OperationCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [tab, setTab] = useState<'calendar' | 'btf'>('calendar')

  const fetchOperations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/operation/calendar')
      const result = res.data
      if (result.success) setEvents(result.data)
    } catch (err) {
      console.error('Failed to fetch operations', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOperations() }, [fetchOperations])

  const fcEvents = events.map((e) => {
    const isNonOp = e.tool_status === 'NOT_OPERATIONAL' || e.operation?.tool_status === 'NOT_OPERATIONAL'
    return {
      id: e.id,
      title: isNonOp ? `⚠ ${e.title}` : e.title,
      start: e.start,
      end: e.end,
      backgroundColor: isNonOp ? '#6b7280' : e.color,
      borderColor: isNonOp ? '#ef4444' : 'transparent',
      textColor: '#fff',
      classNames: isNonOp ? ['fc-event-non-operational'] : [],
      extendedProps: { operation: e.operation, tool_status: e.tool_status },
    }
  })

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>

      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
        ? 'bg-slate-900/80 border-b border-slate-800'
        : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      } px-6 py-4`}>
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('operations.calendar.title')}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('operations.calendar.subtitle')}
              </p>
            </div>
          </div>

          {tab === 'calendar' && <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="scale-90 origin-right">
              <OperationLegend isDark={isDark} />
            </div>
            <div className={`flex items-center gap-2 border-l pl-3 sm:pl-6 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <Button
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className={`h-8 gap-1.5 text-xs font-semibold shadow-sm bg-violet-600 hover:bg-violet-700 text-white`}
              >
                <Plus size={14} />
                <span>{t('operations.calendar.addOperation')}</span>
              </Button>
            </div>
          </div>}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div
          className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}
          role="tablist"
        >
          {([
            { id: 'calendar', icon: CalendarDays, label: t('operations.calendar.btf.tabs.calendar') },
            { id: 'btf', icon: CloudSun, label: t('operations.calendar.btf.tabs.btf') },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'btf' && (
        <div className="p-4">
          <BestTimeToFly isDark={isDark} />
        </div>
      )}

      {tab === 'calendar' && <div className="p-4">
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

          <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${isDark ? 'bg-slate-700/50 border-slate-700' : 'bg-gradient-to-r from-sky-50 to-cyan-50 border-gray-100'}`}>
            <CalendarDays size={15} className={isDark ? 'text-slate-400' : 'text-sky-400'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
              {t('operations.calendar.missionOverview')}
            </span>
            {loading && (
              <span className={`ml-auto text-[11px] animate-pulse font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {t('operations.calendar.loading')}
              </span>
            )}
          </div>

          {loading ? (
            <div className={`p-4 md:p-6 animate-pulse ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className={`h-8 w-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className={`h-8 w-16 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
                <div className={`h-6 w-52 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-16 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className={`h-8 w-16 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className={`h-8 w-12 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
              </div>
              <div className={`grid grid-cols-8 gap-px rounded-t-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className={`h-11 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`} />
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={`h-11 flex flex-col items-center justify-center gap-1.5 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                    <div className={`h-2 w-7 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <div className={`h-3 w-5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                  </div>
                ))}
              </div>
              <div className={`rounded-b-xl overflow-hidden border border-t-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                {Array.from({ length: 9 }).map((_, rowIdx) => (
                  <div key={rowIdx} className={`grid grid-cols-8 gap-px border-t ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}>
                    <div className={`h-16 flex items-start justify-end pr-2.5 pt-2 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50/80'}`}>
                      <div className={`h-2 w-9 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    </div>
                    {Array.from({ length: 7 }).map((_, colIdx) => {
                      const seed = rowIdx * 7 + colIdx
                      const hasBlock = seed % 5 === 0
                      const hasBlock2 = seed % 11 === 0
                      const hasBlock3 = seed % 13 === 0
                      const paletteDark = ['bg-sky-800/50', 'bg-cyan-800/50', 'bg-emerald-800/50', 'bg-rose-800/50', 'bg-amber-800/50', 'bg-indigo-800/50']
                      const paletteLight = ['bg-sky-100', 'bg-cyan-100', 'bg-emerald-100', 'bg-rose-100', 'bg-amber-100', 'bg-indigo-100']
                      const color = isDark ? paletteDark[seed % paletteDark.length] : paletteLight[seed % paletteLight.length]
                      const isToday = colIdx === 2
                      const cellBg = isToday
                        ? isDark ? 'bg-sky-900/20' : 'bg-sky-50/60'
                        : isDark ? 'bg-slate-800' : 'bg-white'
                      return (
                        <div key={colIdx} className={`h-16 relative px-0.5 pt-1 space-y-0.5 ${cellBg}`}>
                          {hasBlock && <div className={`h-6 w-full rounded-md ${color}`} />}
                          {hasBlock2 && <div className={`h-4 w-3/4 rounded-md ${color} opacity-50`} />}
                          {hasBlock3 && <div className={`h-3 w-1/2 rounded-md ${color} opacity-30`} />}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`p-4 md:p-6 ${isDark ? 'fc-dark' : 'fc-light'}`}>
              <style>{FC_CALENDAR_CSS}</style>

            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth,listWeek' }}
                buttonText={{
                    today: t('operations.calendar.calendarButtons.today'),
                    week: t('operations.calendar.calendarButtons.week'),
                    month: t('operations.calendar.calendarButtons.month'),
                    list: t('operations.calendar.calendarButtons.list')
                }}
                events={fcEvents}
                editable={false}
                selectable={false}
                height="auto"
                dayMaxEvents={3}
                nowIndicator={true}
              />
            </div>
          )}
        </div>
      </div>}

      <NewOperationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => fetchOperations()}
        isDark={isDark}
      />
    </div>
  )
}


export function OperationLegend({ isDark }: { isDark: boolean }) {
  const { t } = useTranslation();

  const LEGEND_ITEMS = [
    { labelKey: 'operations.calendar.legend.scheduled', color: '#0284c7' },
    { labelKey: 'operations.calendar.legend.inProgress', color: '#d97706' },
    { labelKey: 'operations.calendar.legend.completed', color: '#16a34a' },
    { labelKey: 'operations.calendar.legend.cancelled', color: '#dc2626' },
  ]

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.labelKey} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t(item.labelKey)}
          </span>
        </div>
      ))}
    </div>
  )
}