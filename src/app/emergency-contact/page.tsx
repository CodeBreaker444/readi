'use client'

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import axios from 'axios'
import { FilterX, Plus, RefreshCw, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ERPFormDialog } from '@/components/emergency-contact/ERPFormDialog'
import { getErpColumns } from '@/components/tables/ERPColumns'
import { TablePagination } from '@/components/tables/Pagination'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTheme } from '@/components/useTheme'
import { EmergencyResponsePlan } from '@/config/types/erp'

export default function EmergencyContactPage() {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  const [data, setData] = useState<EmergencyResponsePlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await axios.get('/api/erp/list')
      setData(result.data.data || [])
    } catch {
      toast.error(t('erp.toast.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (values: { description: string; contact: string; type: string }) => {
    setIsSaving(true)
    try {
      const response = await axios.post('/api/erp/save', values)
      if (response.data.code === 1 && response.data.data) {
        setData((prev) => [response.data.data, ...prev])
        setDialogOpen(false)
        toast.success(t('erp.toast.created'))
      } else {
        throw new Error(response.data.error || 'Server returned an error')
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error
        : t('erp.toast.saveFailed')
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const columns = useMemo(() => getErpColumns(isDark, t), [isDark, t])

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-gray-900'}`}>
      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
        ? 'bg-slate-900/80 border-b border-slate-800 text-white'
        : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
        } px-6 py-4 mb-8`}>
        <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('erp.pageTitle')}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('erp.pageSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadData()}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className={`h-8 gap-1.5 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('erp.newPlan')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-8 space-y-6 animate-slide-up">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: t('erp.stats.total'), value: data.length, color: 'text-violet-500' },
            { label: t('erp.stats.general'), value: data.filter((d) => d.type === 'GENERAL').length, color: 'text-blue-500' },
            { label: t('erp.stats.other'), value: data.filter((d) => d.type !== 'GENERAL').length, color: 'text-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className={`p-5 rounded-xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                  <ShieldAlert className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                  <p className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border text-xs ${isDark ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
          {t('erp.infoBanner')}
        </div>

        <div className={`rounded-xl border overflow-hidden transition-all ${isDark ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-200 shadow-sm'}`}>
          <Table>
            <TableHeader className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className={isDark ? 'border-slate-700' : 'border-slate-200'}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`text-[11px] uppercase tracking-wider font-bold py-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
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
                  <TableRow key={`skeleton-row-${rowIndex}`} className={isDark ? 'border-slate-700' : 'border-slate-200'}>
                    {columns.map((_, cellIndex) => (
                      <TableCell key={`skeleton-cell-${cellIndex}`} className="py-4">
                        <Skeleton className={`h-4 rounded-md ${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${cellIndex === 0 ? 'w-20' : cellIndex === 1 ? 'w-32' : 'w-full'}`} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`group transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700/30' : 'border-slate-200 hover:bg-slate-50/80'}`}
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
                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('erp.table.noResults')}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination table={table} />
      </div>

      <ERPFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
        loading={isSaving}
        isDark={isDark}
      />
    </div>
  )
}
