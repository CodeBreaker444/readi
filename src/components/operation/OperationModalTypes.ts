import { CalendarClock, Settings, User } from 'lucide-react'

export interface Client { client_id: number; client_name: string; client_code: string }
export interface Drone { tool_id: number; tool_code: string; tool_name: string; in_maintenance?: boolean }
export interface PlanningOption { planning_id: number; planning_name: string; fk_client_id: number; client_name: string }
export interface GenericOption { id: number; label: string }
export interface LucOption { id: number; label: string; steps?: any }
export interface PilotOption { user_id: number; first_name: string; last_name: string }
export interface ConflictEvent { id: string; title: string; start: string; end: string }

export type OpType = 'OPEN' | 'PDRA'
export type FlightMode = 'RC' | 'DOCK'

export const DAYS_OF_WEEK = [
    { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
]

export const STEPS = [
    { id: 1, label: 'Client', icon: User },
    { id: 2, label: 'Drone & Mission', icon: Settings },
    { id: 3, label: 'Scheduler', icon: CalendarClock },
    { id: 4, label: 'Pilot', icon: User },
]

export interface SchedulerFormData {
    missionCode: string
    scheduledStart: string
    scheduledEnd: string
    missionName: string
    location: string
    notes: string
    distanceFlown: string
    typeId: string
    categoryId: string
    lucId: string
    isRecurring: boolean
    daysOfWeek: number[]
    recurUntil: string
    missionGroupLabel: string
}
