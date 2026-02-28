'use client'

import { AddShiftModal } from '@/components/team/AddShiftModal'
import { CategoryLegend } from '@/components/team/CategoryBadge'
import { DeleteShiftDialog } from '@/components/team/DeleteShiftDialog'
import { Button } from '@/components/ui/button'
import { CalendarEvent, Shift } from '@/config/types/crewShift'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import axios from 'axios'
import { CalendarDays, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../useTheme'

export function CrewShiftCalendar() {
  const { isDark } = useTheme()
  const calendarRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; shift: Shift | null }>({ open: false, shift: null })

  const fetchShifts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/team/shift')
      const result = res.data
      if (result.success) setEvents(result.data)
    } catch (err) {
      console.error('Failed to fetch shifts', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  const handleDeleteSuccess = (shiftId: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== String(shiftId)))
  }

  const handleEventClick = (clickInfo: any) => {
    const shift = clickInfo.event.extendedProps?.shift as Shift
    if (shift) setDeleteDialog({ open: true, shift })
  }

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color,
    borderColor: 'transparent',
    textColor: '#fff',
    extendedProps: { shift: e.shift },
  }))

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
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Crew Shift Calendar
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Manage pilot shift scheduling and assignments
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="scale-90 origin-right">
              <CategoryLegend isDark={isDark} />
            </div>
            <div className={`flex items-center gap-2 border-l pl-3 sm:pl-6 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <Button
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className={`h-8 gap-1.5 text-xs font-semibold shadow-sm ${isDark
                  ? 'bg-white hover:bg-white/90 text-black'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
                }`}
              >
                <Plus size={14} />
                <span>Add New Shift</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>

          <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${isDark ? 'bg-slate-700/50 border-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-100'}`}>
            <CalendarDays size={15} className={isDark ? 'text-slate-400' : 'text-indigo-400'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
              Schedule Overview
            </span>
            {loading && (
              <span className={`ml-auto text-[11px] animate-pulse font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Loading…
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
                  <div
                    key={rowIdx}
                    className={`grid grid-cols-8 gap-px border-t ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}
                  >
                    <div className={`h-16 flex items-start justify-end pr-2.5 pt-2 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50/80'}`}>
                      <div className={`h-2 w-9 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    </div>

                    {Array.from({ length: 7 }).map((_, colIdx) => {
                      const seed     = rowIdx * 7 + colIdx
                      const hasBlock  = seed % 5 === 0
                      const hasBlock2 = seed % 11 === 0
                      const hasBlock3 = seed % 13 === 0

                      const paletteDark  = ['bg-indigo-800/50','bg-violet-800/50','bg-emerald-800/50','bg-rose-800/50','bg-amber-800/50','bg-sky-800/50']
                      const paletteLight = ['bg-indigo-100',   'bg-violet-100',   'bg-emerald-100',  'bg-rose-100',  'bg-amber-100',  'bg-sky-100'  ]
                      const color = isDark
                        ? paletteDark [seed % paletteDark.length]
                        : paletteLight[seed % paletteLight.length]

                      const isToday = colIdx === 2
                      const cellBg = isToday
                        ? isDark ? 'bg-violet-900/20' : 'bg-violet-50/60'
                        : isDark ? 'bg-slate-800'     : 'bg-white'

                      return (
                        <div key={colIdx} className={`h-16 relative px-0.5 pt-1 space-y-0.5 ${cellBg}`}>
                          {hasBlock  && <div className={`h-6 w-full rounded-md ${color}`} />}
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

                /* ── Light ── */
                .fc-light .fc-toolbar-title { color: #1e293b; }
                .fc-light .fc-button { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #475569 !important; }
                .fc-light .fc-button:hover { background: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #1e293b !important; }
                .fc-light .fc-button-active,
                .fc-light .fc-button-primary:not(:disabled).fc-button-active { background: #6d28d9 !important; border-color: #6d28d9 !important; color: #fff !important; }
                .fc-light .fc-today-button { background: #ede9fe !important; border-color: #ddd6fe !important; color: #6d28d9 !important; }
                .fc-light .fc-col-header-cell-cushion { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
                .fc-light .fc-daygrid-day-number { color: #64748b; font-size: 12px; font-weight: 600; }
                .fc-light .fc-timegrid-slot-label { color: #94a3b8; font-size: 11px; }
                .fc-light .fc-scrollgrid { border-color: #e2e8f0 !important; }
                .fc-light .fc-scrollgrid-section > td { border-color: #e2e8f0 !important; }
                .fc-light .fc-timegrid-slot { border-color: #f1f5f9 !important; }
                .fc-light .fc-col-header-cell { border-color: #e2e8f0 !important; background: #f8fafc; }
                .fc-light .fc-daygrid-day { border-color: #f1f5f9 !important; }
                .fc-light .fc-day-today { background: #f5f3ff !important; }
                .fc-light .fc-list-day-cushion { background: #f8fafc; }
                .fc-light .fc-list-day-text,
                .fc-light .fc-list-day-side-text { color: #475569; font-weight: 700; font-size: 12px; }
                .fc-light .fc-list-event-title { color: #1e293b; }
                .fc-light .fc-list-event-time { color: #94a3b8; font-size: 11px; }
                .fc-light .fc-list-table td { border-color: #f1f5f9; }
                .fc-light .fc-list-table tr:hover td { background: #fafafa; }
                .fc-light .fc-list-empty { color: #94a3b8; }

                /* ── Dark ── */
                .fc-dark .fc-toolbar-title { color: #f1f5f9; }
                .fc-dark .fc-button { background: #1e293b !important; border: 1px solid #334155 !important; color: #94a3b8 !important; }
                .fc-dark .fc-button:hover { background: #334155 !important; border-color: #475569 !important; color: #f1f5f9 !important; }
                .fc-dark .fc-button-active,
                .fc-dark .fc-button-primary:not(:disabled).fc-button-active { background: #6d28d9 !important; border-color: #6d28d9 !important; color: #fff !important; }
                .fc-dark .fc-today-button { background: #2e1065 !important; border-color: #4c1d95 !important; color: #c4b5fd !important; }
                .fc-dark .fc-col-header-cell-cushion { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
                .fc-dark .fc-daygrid-day-number { color: #64748b; font-size: 12px; font-weight: 600; }
                .fc-dark .fc-timegrid-slot-label { color: #475569; font-size: 11px; }
                .fc-dark .fc-scrollgrid { border-color: #1e293b !important; }
                .fc-dark .fc-scrollgrid-section > td { border-color: #1e293b !important; }
                .fc-dark .fc-timegrid-slot { border-color: #0f172a !important; }
                .fc-dark .fc-col-header-cell { border-color: #1e293b !important; background: #0f172a; }
                .fc-dark .fc-daygrid-day { border-color: #1e293b !important; }
                .fc-dark .fc-day-today { background: #1a0e33 !important; }
                .fc-dark .fc-list-day-cushion { background: #0f172a; }
                .fc-dark .fc-list-day-text,
                .fc-dark .fc-list-day-side-text { color: #64748b; font-weight: 700; font-size: 12px; }
                .fc-dark .fc-list-event-title { color: #e2e8f0; }
                .fc-dark .fc-list-event-time { color: #475569; font-size: 11px; }
                .fc-dark .fc-list-table td { border-color: #1e293b; }
                .fc-dark .fc-list-table tr:hover td { background: #0f172a; }
                .fc-dark .fc-list-empty { color: #475569; }
                .fc-dark .fc-theme-standard td,
                .fc-dark .fc-theme-standard th { border-color: #1e293b; }
              `}</style>

              <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth,listWeek' }}
                buttonText={{ today: 'Today', week: 'Week', month: 'Month', list: 'List' }}
                events={fcEvents}
                eventClick={handleEventClick}
                editable={false}
                selectable={false}
                height="auto"
                dayMaxEvents={3}
                nowIndicator={true}
              />
            </div>
          )}
        </div>
      </div>

      <AddShiftModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(count: number) => fetchShifts()}
        isDark={isDark}
      />

      <DeleteShiftDialog
        open={deleteDialog.open}
        shift={deleteDialog.shift}
        onClose={() => setDeleteDialog({ open: false, shift: null })}
        onSuccess={handleDeleteSuccess}
        isDark={isDark}
      />
    </div>
  )
}