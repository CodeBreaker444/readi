'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import axios from 'axios'
import {
  Activity,
  FilterX,
  Plus, RefreshCw, Search, ShieldCheck,
  TrendingUp
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { IndicatorFormDialog } from '@/components/safety-management/IndicatorFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { getIndicatorColumns } from '@/components/tables/IndicatorColumn'
import { TablePagination } from '@/components/tables/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/useTheme'
import { SpiKpiDefinition, SpiKpiFilters } from '@/config/types/safetyMng'

const AREA_COLORS: Record<string, string> = {
  COMPLIANCE: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  TRAINING: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  OPERATIONS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  MAINTENANCE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

export default function SpiKpiDefinitionsPage() {
  const { isDark } = useTheme()
  const [data, setData] = useState<SpiKpiDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isToggling, setIsToggling] = useState<number | null>(null)

  const [filters, setFilters] = useState<SpiKpiFilters>({ q: '', area: '', active: '' })
  const [appliedFilters, setAppliedFilters] = useState<SpiKpiFilters>({ q: '', area: '', active: '' })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SpiKpiDefinition | null>(null)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await axios.get('/api/safety/spi-kpi/list', { params: appliedFilters })
      setData(result.data.data || [])
    } catch (err) {
      toast.error('Failed to load indicators')
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters])

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
        toast.success('Record synchronized')
      } else {
        throw new Error(response.data.error || 'Server returned an error')
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error
        : 'Save failed'
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
        toast.success(`Indicator ${activeStatus === 1 ? 'activated' : 'deactivated'}`)
      }
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : 'Toggle failed';
      toast.error(msg);
    } finally {
      setIsToggling(null)
    }
  }

  const openNew = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (row: SpiKpiDefinition) => { setEditing(row); setDialogOpen(true) }
  const applyFilters = () => setAppliedFilters({ ...filters })

  const columns = useMemo(
    () => getIndicatorColumns(isDark, openEdit, handleToggle, isToggling, AREA_COLORS),
    [isDark, isToggling]
  )

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: setPagination,
  })

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-gray-900'
      } `}>
     <div className={`top-0 z-10 backdrop-blur-md transition-colors ${
  isDark
    ? "bg-slate-900/80 border-b border-slate-800 text-white"
    : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
} px-6 py-4 mb-8`}>
  <div className="mx-auto max-w-[1800px] flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-1 h-6 rounded-full bg-violet-600" />
      <div>
        <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
          SPI / KPI Definitions
        </h1>
        <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Safety Management · Monitoring safety performance indicators
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <Button 
        onClick={openNew} 
        className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
      >
        <Plus className="w-3.5 h-3.5" /> 
        New Indicator
      </Button>
    </div>
  </div>
</div>

      <div className="mx-auto px-6 py-8 space-y-6 animate-slide-up">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Indicators', value: data.length, icon: Activity, color: 'text-blue-500' },
            { label: 'Active Monitors', value: data.filter(d => d.is_active === 1).length, icon: TrendingUp, color: 'text-emerald-500' },
            { label: 'Operations Area', value: data.filter(d => d.indicator_area === 'OPERATIONS').length, icon: ShieldCheck, color: 'text-amber-500' },
          ].map((stat) => (
            <div key={stat.label} className={`p-5 rounded-xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
              }`}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                  <p className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[280px]">
              <label className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Search Definitions</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={filters.q}
                  onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
                  placeholder="Code, name or description..."
                  className={`pl-10 h-10 ${isDark
                      ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:ring-blue-500'
                      : 'bg-slate-50 border-slate-200 text-gray-900'
                    }`}
                />
              </div>
            </div>

            {[
              { label: 'Area', key: 'area' as const, opts: [['ALL', 'All Areas'], ['COMPLIANCE', 'Compliance'], ['TRAINING', 'Training'], ['OPERATIONS', 'Operations'], ['MAINTENANCE', 'Maintenance']] },
              { label: 'Status', key: 'active' as const, opts: [['ALL', 'All Status'], ['1', 'Active Only'], ['0', 'Inactive Only']] }
            ].map((fConfig) => (
              <div key={fConfig.key} className="w-44">
                <label className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{fConfig.label}</label>
                <Select
                  value={filters[fConfig.key] || 'ALL'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, [fConfig.key]: v === 'ALL' ? '' : v as any }))}
                >
                  <SelectTrigger className={`h-10 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white'}>
                    {fConfig.opts.map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <Button onClick={applyFilters} disabled={isLoading} className="h-10 bg-slate-700 hover:bg-slate-600 text-white px-6">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Apply
            </Button>
          </div>
        </div>

        <div className={`rounded-xl border overflow-hidden transition-all ${isDark ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-200 shadow-sm'
          }`}>
          <Table>
            <TableHeader className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className={isDark ? 'border-slate-700' : 'border-slate-200'}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={`text-[11px] uppercase tracking-wider font-bold py-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-row-${rowIndex}`} className={isDark ? 'border-slate-700' : 'border-slate-200'}>
                    {columns.map((_, cellIndex) => (
                      <TableCell key={`skeleton-cell-${cellIndex}`} className="py-4">
                        <Skeleton
                          className={`h-4 w-full rounded-md ${isDark ? 'bg-slate-800' : 'bg-slate-200'
                            } ${
                            cellIndex === 0 ? "w-12" :
                              cellIndex === 1 ? "w-16" :
                                cellIndex === 2 ? "w-48" :
                                  "w-full"
                            }`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`group transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700/30' : 'border-slate-200 hover:bg-slate-50/80'
                      }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-64 text-center">
                    <FilterX className="w-10 h-10 mx-auto text-slate-700 mb-2 opacity-20" />
                    <p className="text-slate-500 text-sm">No indicators match your current selection.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination table={table} />
      </div>

      <IndicatorFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
        initial={editing}
        loading={isSaving}
        isDark={isDark}
      />
    </div>
  )
}