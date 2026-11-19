'use client'

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import axios from 'axios'
import { Activity, FilterX, Plane, Plus, RefreshCw, Search, Target } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FeatureGate } from '@/components/permissions/FeatureGate'
import { IndicatorFormDialog } from '@/components/safety-management/IndicatorFormDialog'
import { LogMeasurementDialog } from '@/components/safety-management/LogMeasurementDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { getIndicatorColumns } from '@/components/tables/IndicatorColumn'
import { TablePagination } from '@/components/tables/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/useTheme'
import { SpiKpiDefinition, SpiKpiFilters } from '@/config/types/safetyMng'
import { useTranslation } from 'react-i18next'

const AREA_COLORS: Record<string, string> = {
  COMPLIANCE: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  TRAINING: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  OPERATIONS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  MAINTENANCE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

function CountUp({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setDisplay(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <>{display}</>
}

export default function SpiKpiDefinitionsPage() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [data, setData] = useState<SpiKpiDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isToggling, setIsToggling] = useState<number | null>(null)

  const [filters, setFilters] = useState<SpiKpiFilters>({ q: '', area: '', active: '' })
  const [appliedFilters, setAppliedFilters] = useState<SpiKpiFilters>({ q: '', area: '', active: '' })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SpiKpiDefinition | null>(null)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [logTarget, setLogTarget] = useState<SpiKpiDefinition | null>(null)
  const [isLogging, setIsLogging] = useState(false)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await axios.get('/api/safety/spi-kpi/list', { params: appliedFilters })
      setData(result.data.data || [])
    } catch (err) {
      toast.error(t('safety.spiKpi.toast.loadError'))  
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters, t])

  useEffect(() => { loadData() }, [loadData])

const handleSave = async (payload: any) => {
    setIsSaving(true)
    try {
      const response = await axios.post('/api/safety/spi-kpi/save', payload)
      const savedRecord = response.data.data

      if (response.data.code === 1 && savedRecord) {
        setData(prev => {
          const isUpdate = !!(payload.id || editing?.id)
          if (isUpdate) {
            return prev.map(r => r.id === savedRecord.id ? savedRecord : r)
          } else {
            return [savedRecord, ...prev]
          }
        })
        setDialogOpen(false)
        toast.success(t('safety.spiKpi.toast.recordSynced')) 
      } else {
        throw new Error(response.data.error || 'Server returned an error')
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error
        : t('safety.spiKpi.toast.saveFailed') 
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (row: SpiKpiDefinition) => {
    setIsToggling(row.id)
    try {
      const activeStatus = row.is_active === 1 ? 0 : 1;

      const res = await axios.post('/api/safety/spi-kpi/toggle', {
        id: row.id,
        is_active: activeStatus
      })

      if (res.data.code === 1) {
        const updatedRecord = res.data.data;
        setData(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r))
       toast.success(
          activeStatus === 1 
            ? t('safety.spiKpi.toast.activated') 
            : t('safety.spiKpi.toast.deactivated')
        )
      }
    } catch (err) {
      toast.error(t('safety.spiKpi.toast.toggleFailed'));
    } finally {
      setIsToggling(null)
    }
  }

  const handleLogValue = async (payload: {
    definition_id: number
    measurement_date: string
    actual_value: number
    target_value: number
  }) => {
    setIsLogging(true)
    try {
      const response = await axios.post('/api/safety/spi-kpi/log-measurement', payload)
      if (response.data.code === 1) {
        setLogDialogOpen(false)
        toast.success(t('safety.spiKpi.toast.measurementLogged'))
      } else {
        throw new Error(response.data.error || 'Server returned an error')
      }
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.error : t('safety.spiKpi.toast.logFailed')
      toast.error(message)
    } finally {
      setIsLogging(false)
    }
  }

  const openNew = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (row: SpiKpiDefinition) => { setEditing(row); setDialogOpen(true) }
  const openLogValue = (row: SpiKpiDefinition) => { setLogTarget(row); setLogDialogOpen(true) }
  const applyFilters = () => setAppliedFilters({ ...filters })

  const columns = useMemo(
    () => getIndicatorColumns(isDark, openEdit, handleToggle, isToggling, AREA_COLORS, t, openLogValue),
    [isDark, isToggling]
  )

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  // Reset to the first page whenever a new result set is loaded.
  useEffect(() => { setPagination((p) => ({ ...p, pageIndex: 0 })) }, [appliedFilters])

  const activeCount = data.filter((d) => d.is_active === 1).length
  const operationsCount = data.filter((d) => d.indicator_area === 'OPERATIONS').length
  const statCards = [
    { label: t('safety.spiKpi.stats.totalIndicators'), value: data.length, icon: Target, accent: '#7c3aed', iconBg: isDark ? 'bg-violet-500/10' : 'bg-violet-50', iconColor: 'text-violet-500' },
    { label: t('safety.spiKpi.stats.activeMonitors'), value: activeCount, icon: Activity, accent: '#10b981', iconBg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { label: t('safety.spiKpi.stats.operationsArea'), value: operationsCount, icon: Plane, accent: '#f59e0b', iconBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', iconColor: 'text-amber-500' },
  ]
  const border = isDark ? 'border-white/[0.06]' : 'border-gray-100'
  const inputCls = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : ''
  const labelCls = `text-[10px] font-semibold uppercase tracking-[0.08em] mb-1.5 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]'}`}>
      <div className={`top-0 z-20 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#0a0e1a]/90 border-white/[0.06]' : 'bg-white/80 border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto max-w-[1600px] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('safety.spiKpi.pageTitle')}
              </h1>
              <p className={`text-[11px] mt-0.5 tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('safety.spiKpi.stats.totalIndicators')}: {data.length} · {t('safety.spiKpi.stats.activeMonitors')}: {activeCount}
              </p>
            </div>
          </div>
          <FeatureGate feature="safety_spi_kpi_definitions" require="create">
            <Button
              size="sm"
              onClick={openNew}
              className="h-8 gap-1.5 px-3.5 text-xs font-medium rounded-lg transition-all cursor-pointer bg-violet-600 hover:bg-violet-700"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>{t('safety.spiKpi.newIndicator')}</span>
            </Button>
          </FeatureGate>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map(({ label, value, icon: Icon, accent, iconBg, iconColor }) => (
            <div
              key={label}
              className={`relative overflow-hidden rounded-xl border p-5 flex flex-col gap-3 ${isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'}`}
            >
              <div className="absolute left-0 top-0 h-full w-0.5 rounded-l-xl" style={{ backgroundColor: accent }} />
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10" style={{ backgroundColor: accent }} />
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium tracking-wide uppercase ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
                 
              </div>
              <div className={`text-3xl font-bold tabular-nums tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isLoading ? '–' : <CountUp value={value} />}
              </div>
            </div>
          ))}
        </div>

        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#0f1320] border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]' : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]'}`}>
          <div className={`px-5 py-4 border-b ${border}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('safety.spiKpi.pageTitle')}</h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('safety.spiKpi.infoBanner')} <strong className="font-semibold">{t('safety.spiKpi.infoBannerLogValue')}</strong> {t('safety.spiKpi.infoBannerSuffix')}
            </p>
          </div>

          <div className={`px-5 py-3 border-b flex flex-wrap items-end gap-3 ${border}`}>
            <div className="flex-1 min-w-[240px]">
              <label className={labelCls}>{t('safety.spiKpi.filters.searchDefinitions')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters() }}
                  placeholder={t('safety.spiKpi.filters.searchPlaceholder')}
                  className={`pl-9 h-9 text-sm ${inputCls}`}
                />
              </div>
            </div>

            {[
              { label: t('safety.spiKpi.filters.area'), key: 'area' as const, opts: [['ALL', t('safety.spiKpi.filters.allAreas')], ['COMPLIANCE', t('safety.spiKpi.areas.COMPLIANCE')], ['TRAINING', t('safety.spiKpi.areas.TRAINING')], ['OPERATIONS', t('safety.spiKpi.areas.OPERATIONS')], ['MAINTENANCE', t('safety.spiKpi.areas.MAINTENANCE')]] },
              { label: t('safety.spiKpi.filters.status'), key: 'active' as const, opts: [['ALL', t('safety.spiKpi.filters.allStatus')], ['1', t('safety.spiKpi.filters.activeOnly')], ['0', t('safety.spiKpi.filters.inactiveOnly')]] },
            ].map((fConfig) => (
              <div key={fConfig.key} className="w-44">
                <label className={labelCls}>{fConfig.label}</label>
                <Select
                  value={filters[fConfig.key] || 'ALL'}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, [fConfig.key]: v === 'ALL' ? '' : (v as any) }))}
                >
                  <SelectTrigger className={`h-9 text-sm ${inputCls}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDark ? 'bg-[#0f1320] border-white/[0.08] text-white' : ''}>
                    {fConfig.opts.map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <Button
              onClick={applyFilters}
              disabled={isLoading}
              variant="outline"
              className={`h-9 gap-1.5 px-4 text-xs font-medium rounded-lg cursor-pointer ${isDark ? 'bg-transparent border-gray-700 text-gray-200 hover:bg-white/[0.04]' : ''}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {t('safety.spiKpi.filters.apply')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className={`border-b hover:bg-transparent ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] ${isDark ? 'text-gray-500 bg-white/[0.02]' : 'text-gray-400 bg-gray-50/60'}`}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, rowIndex) => (
                    <TableRow key={`skeleton-row-${rowIndex}`} className={`border-b ${isDark ? 'border-white/[0.04]' : 'border-gray-50'}`}>
                      {columns.map((_, cellIndex) => (
                        <TableCell key={`skeleton-cell-${cellIndex}`} className="px-5 py-3.5">
                          <Skeleton
                            className={`h-4 rounded-md ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'} ${cellIndex === 0 ? 'w-16' : cellIndex === 1 ? 'w-20' : cellIndex === 2 ? 'w-48' : 'w-full'}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`group transition-colors border-b ${isDark ? 'border-white/[0.04] hover:bg-white/[0.03]' : 'border-gray-50 hover:bg-gray-50/50'}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-5 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length}>
                      <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${isDark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-gray-100 ring-1 ring-gray-200/60'}`}>
                          <FilterX size={20} className="opacity-50" />
                        </div>
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('safety.spiKpi.table.noResults')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className={`border-t flex items-center justify-end px-3 ${border}`}>
            <TablePagination table={table} />
          </div>
        </div>
      </div>

      <IndicatorFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
        initial={editing}
        loading={isSaving}
        isDark={isDark}
      />

      <LogMeasurementDialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        onSubmit={handleLogValue}
        indicator={logTarget}
        loading={isLogging}
        isDark={isDark}
      />
    </div>
  )
}
