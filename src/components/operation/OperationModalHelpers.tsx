'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

export const SELECT_PAGE_SIZE = 10

export function usePagedItems<T>(items: T[], pageSize: number = SELECT_PAGE_SIZE) {
    const [page, setPage] = useState(0)

    useEffect(() => {
        setPage(0)
    }, [items])

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
    const paged = items.slice(page * pageSize, page * pageSize + pageSize)

    return { page, setPage, totalPages, paged, showPagination: items.length > pageSize }
}

interface SelectPaginationFooterProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    previousLabel: string
    nextLabel: string
    indicatorLabel: string
    isDark?: boolean
}

export function SelectPaginationFooter({ page, totalPages, onPageChange, previousLabel, nextLabel, indicatorLabel, isDark = false }: SelectPaginationFooterProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-between gap-2 mt-1 pt-1.5 px-1 border-t text-xs',
                isDark ? 'border-slate-700 text-slate-400' : 'border-border text-muted-foreground'
            )}
            onPointerDown={e => e.stopPropagation()}
        >
            <button
                type="button"
                disabled={page === 0}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onPageChange(Math.max(0, page - 1)) }}
                className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-accent'
                )}
            >
                <ChevronLeft className="h-3.5 w-3.5" />
                {previousLabel}
            </button>
            <span>{indicatorLabel}</span>
            <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onPageChange(Math.min(totalPages - 1, page + 1)) }}
                className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-accent'
                )}
            >
                {nextLabel}
                <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

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
