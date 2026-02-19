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
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../useTheme'



export function CrewShiftCalendar() {
    const { isDark } = useTheme();
    const calendarRef = useRef<FullCalendar>(null)
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean
        shift: Shift | null
    }>({ open: false, shift: null })

    const fetchShifts = useCallback(async () => {
        setLoading(true)
        try {
            const res = await axios.get('/api/team/shift')
            const result = res.data
            if (result.success) {
                setEvents(result.data)
            }
        } catch (err) {
            console.error('Failed to fetch shifts', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchShifts()
    }, [fetchShifts])

    const handleAddSuccess = (count: number) => {
        fetchShifts()
    }

    const handleDeleteSuccess = (shiftId: number) => {
        setEvents((prev) => prev.filter((e) => e.id !== String(shiftId)))
    }

    const handleEventClick = (clickInfo: any) => {
        const event = clickInfo.event
        const shift = event.extendedProps?.shift as Shift
        if (shift) {
            setDeleteDialog({ open: true, shift })
        }
    }

    const fcEvents = events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: e.color,
        borderColor: e.color,
        textColor: '#fff',
        extendedProps: { shift: e.shift },
    }))

    const containerBg = isDark ? 'bg-slate-900' : 'bg-gray-50'
    const headerBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    const textPrimary = isDark ? 'text-white' : 'text-slate-900'
    const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500'

    return (
        <div className={`min-h-screen ${containerBg} p-4 md:p-6`}>
            <div
                className={`rounded-xl border p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${headerBg}`}
            >
                <div>
                    <h1 className={`text-xl font-bold tracking-tight ${textPrimary}`}>
                        Crew Shift Calendar
                    </h1>
                    <p className={`text-sm mt-0.5 ${textSecondary}`}>
                        Manage pilot shift scheduling and assignments
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <CategoryLegend isDark={isDark} />
                    <Button
                        onClick={() => setAddModalOpen(true)}
                        className={`${isDark ? 'bg-white hover:bg-white/90 text-black' : ''} h-9 gap-2 shrink-0`}
                    >
                        <Plus className="w-4 h-4" />
                        Add New Shift
                    </Button>
                </div>
            </div>

            <div
                className={`rounded-xl border overflow-hidden ${headerBg}`}
                style={{ minHeight: '600px' }}
            >
                {loading && (
                    <div className={`flex items-center justify-center h-24 ${textSecondary} text-sm`}>
                        Loading shifts...
                    </div>
                )}

                <div className={`p-3 md:p-4 ${isDark ? 'fc-dark' : ''}`}>
                    <style>{`
            ${isDark ? `
              .fc-dark .fc-toolbar-title { color: #f1f5f9; }
              .fc-dark .fc-button { background: #334155 !important; border-color: #475569 !important; color: #f1f5f9 !important; }
              .fc-dark .fc-button:hover { background: #475569 !important; }
              .fc-dark .fc-button-active { background: #3b82f6 !important; border-color: #3b82f6 !important; }
              .fc-dark .fc-col-header-cell-cushion { color: #94a3b8; }
              .fc-dark .fc-daygrid-day-number { color: #94a3b8; }
              .fc-dark .fc-timegrid-slot-label { color: #64748b; }
              .fc-dark .fc-scrollgrid { border-color: #334155; }
              .fc-dark .fc-scrollgrid-section > td { border-color: #334155; }
              .fc-dark .fc-timegrid-slot { border-color: #1e293b; }
              .fc-dark .fc-col-header-cell { border-color: #334155; background: #1e293b; }
              .fc-dark .fc-daygrid-day { border-color: #334155; }
              .fc-dark .fc-list-day-cushion { background: #1e293b; color: #94a3b8; }
              .fc-dark .fc-list-event-title { color: #f1f5f9; }
              .fc-dark .fc-list-event-time { color: #64748b; }
              .fc-dark .fc-list-table td { border-color: #334155; }
              .fc-dark .fc-list-table tr:hover td { background: #1e293b; }
            ` : ''}
            .fc-event { cursor: pointer; border-radius: 4px !important; font-size: 12px !important; }
            .fc-event:hover { filter: brightness(1.1); }
            .fc-toolbar { flex-wrap: wrap; gap: 8px; }
          `}</style>
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'timeGridWeek,dayGridMonth,listWeek',
                        }}
                        events={fcEvents}
                        eventClick={handleEventClick}
                        editable={false}
                        selectable={false}
                        height="auto"
                    />
                </div>
            </div>

            <AddShiftModal
                open={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSuccess={handleAddSuccess}
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