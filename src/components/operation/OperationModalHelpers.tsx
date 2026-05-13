'use client'

import { cn } from '@/lib/utils'

export function isoToLocalInput(iso: string | null | undefined): string {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        if (isNaN(d.getTime())) return ''
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
        return ''
    }
}

export function inputCls(isDark: boolean) {
    return isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : ''
}

export function labelCls(isDark: boolean) {
    return `mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`
}

export function scCls(isDark: boolean) {
    return isDark ? 'bg-slate-700 border-slate-600 text-white' : ''
}

export function siCls(isDark: boolean) {
    return isDark ? 'focus:bg-slate-600 text-white' : ''
}

export function SectionTitle({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
    return (
        <h4 className={cn('text-sm font-semibold border-b pb-2 mb-3', isDark ? 'text-slate-200 border-slate-700' : 'text-foreground')}>
            {children}
        </h4>
    )
}

export function ReviewRow({ label, value, isDark }: { label: string; value?: string; isDark: boolean }) {
    if (!value) return null
    return (
        <div className="flex gap-3">
            <span className={cn('w-28 shrink-0 text-xs', isDark ? 'text-slate-400' : 'text-muted-foreground')}>{label}</span>
            <span className={cn('text-xs font-medium', isDark && 'text-slate-200')}>{value}</span>
        </div>
    )
}
