'use client'

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import axios from 'axios'
import {
  FilterX,
  FolderOpen,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ERPFormDialog } from '@/components/emergency-contact/ERPFormDialog'
import { LocationGroupFormDialog } from '@/components/emergency-contact/LocationGroupFormDialog'
import { getErpColumns } from '@/components/tables/ERPColumns'
import { TablePagination } from '@/components/tables/Pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTheme } from '@/components/useTheme'
import { EmergencyResponsePlan, LocationGroup } from '@/config/types/erp'
import { cn } from '@/lib/utils'

type Tab = 'general' | 'location-group'

export default function EmergencyContactPage() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const [data, setData] = useState<EmergencyResponsePlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<EmergencyResponsePlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmergencyResponsePlan | null>(null)
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
        ? err.response?.data?.error || err.response?.data?.message || t('erp.toast.saveFailed')
        : t('erp.toast.saveFailed')
      toast.error(message)
      console.error('ERP create error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (values: { description: string; contact: string; type: string }) => {
    if (!editRecord) return
    setIsSaving(true)
    try {
      const response = await axios.post('/api/erp/update', { id: editRecord.id, ...values })
      if (response.data.code === 1 && response.data.data) {
        setData((prev) => prev.map((r) => (r.id === editRecord.id ? response.data.data : r)))
        setEditRecord(null)
        setDialogOpen(false)
        toast.success(t('erp.toast.updated'))
      } else {
        throw new Error(response.data.error || 'Server returned an error')
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.response?.data?.message || t('erp.toast.updateFailed')
        : t('erp.toast.updateFailed')
      toast.error(message)
      console.error('ERP update error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await axios.post('/api/erp/delete', { id: deleteTarget.id })
      setData((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      toast.success(t('erp.toast.deleted'))
    } catch {
      toast.error(t('erp.toast.deleteFailed'))
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleOpenEdit = (row: EmergencyResponsePlan) => {
    setEditRecord(row)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditRecord(null)
  }

  const columns = useMemo(() => getErpColumns(isDark, t, undefined, {
    onEdit: handleOpenEdit,
    onDelete: setDeleteTarget,
  }), [isDark, t])

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  const [groups, setGroups] = useState<LocationGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsSaving, setGroupsSaving] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<LocationGroup | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<LocationGroup | null>(null)

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const res = await axios.get('/api/erp/location-group/list')
      setGroups(res.data.data || [])
    } catch {
      toast.error('Failed to load location groups')
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'location-group') loadGroups()
  }, [activeTab, loadGroups])

  const handleGroupSubmit = async (values: {
    name: string; notes: string; is_active: boolean
    locations: any[]; existing_contact_ids: number[]; new_contacts: any[]
  }) => {
    setGroupsSaving(true)
    try {
      const endpoint = editGroup
        ? '/api/erp/location-group/update'
        : '/api/erp/location-group/save'
      const payload = editGroup ? { id: editGroup.group_id, ...values } : values
      console.log('Submitting location group:', payload)
      const res = await axios.post(endpoint, payload)
      console.log('Location group response:', res.data)
      if (res.data.code === 1 && res.data.data) {
        if (editGroup) {
          setGroups(prev => prev.map(g => g.group_id === editGroup.group_id ? res.data.data : g))
          toast.success('Group updated')
        } else {
          setGroups(prev => [res.data.data, ...prev])
          toast.success('Group created')
        }
        setGroupDialogOpen(false)
        setEditGroup(null)
      } else {
        throw new Error(res.data.error || 'Server returned an error')
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.response?.data?.message || (editGroup ? 'Failed to update group' : 'Failed to create group')
        : (editGroup ? 'Failed to update group' : 'Failed to create group')
      toast.error(message)
      console.error('Location group submit error:', err)
    } finally {
      setGroupsSaving(false)
    }
  }

  const handleGroupDelete = async () => {
    if (!deleteGroup) return
    try {
      await axios.post('/api/erp/location-group/delete', { id: deleteGroup.group_id })
      setGroups(prev => prev.filter(g => g.group_id !== deleteGroup.group_id))
      toast.success(t('erp.locationGroup.toastDeleted'))
    } catch {
      toast.error(t('erp.locationGroup.toastDeleteFailed'))
    } finally {
      setDeleteGroup(null)
    }
  }

  const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
    { id: 'general', label: 'General', icon: ShieldAlert },
    { id: 'location-group', label: 'Location Groups', icon: Layers },
  ]

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-gray-900'}`}>

      {/* Page header */}
      <div className={`top-0 z-10 backdrop-blur-md transition-colors ${isDark
        ? 'bg-slate-900/80 border-b border-slate-800 text-white'
        : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
        } px-6 py-4`}>
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
              onClick={() => activeTab === 'general' ? loadData() : loadGroups()}
              disabled={isLoading || groupsLoading}
              variant="ghost"
              size="sm"
              className={`h-8 gap-1.5 text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || groupsLoading) ? 'animate-spin' : ''}`} />
            </Button>

            {activeTab === 'general' ? (
              <Button
                onClick={() => { setEditRecord(null); setDialogOpen(true) }}
                className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('erp.newPlan')}
              </Button>
            ) : (
              <Button
                onClick={() => { setEditGroup(null); setGroupDialogOpen(true) }}
                className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('erp.locationGroup.newGroup')}
              </Button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto max-w-[1800px] mt-3 flex gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center cursor-pointer gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
                    : isDark
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mx-auto px-6 py-8 space-y-6 animate-slide-up">

        {activeTab === 'general' && (
          <>
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
          </>
        )}

        {activeTab === 'location-group' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Groups', value: groups.length, color: 'text-violet-500' },
                { label: 'Active', value: groups.filter(g => g.is_active).length, color: 'text-emerald-500' },
                { label: 'Inactive', value: groups.filter(g => !g.is_active).length, color: 'text-slate-400' },
              ].map((stat) => (
                <div key={stat.label} className={`p-5 rounded-xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                      <Layers className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                      <p className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {groupsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`p-5 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <Skeleton className={`h-5 w-2/3 mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <Skeleton className={`h-3 w-full mb-1.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <Skeleton className={`h-3 w-3/4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className={`rounded-xl border p-12 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No location groups yet</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>Create a group to organize contacts by location zone</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groups.map(group => (
                  <div
                    key={group.group_id}
                    className={cn(
                      'p-5 rounded-xl border transition-all',
                      isDark ? 'bg-slate-800 border-slate-700 shadow-xl hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold',
                            group.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : isDark
                                ? 'bg-slate-700 text-slate-400 border border-slate-600'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                          )}>
                            {group.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <h3 className={`font-semibold text-sm leading-snug truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {group.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditGroup(group); setGroupDialogOpen(true) }}
                          className={`h-7 w-7 ${isDark ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteGroup(group)}
                          className={`h-7 w-7 ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {group.notes && (
                      <p className={`text-xs mb-3 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {group.notes}
                      </p>
                    )}

                    <div className={`flex items-center gap-3 text-xs pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <MapPin className="h-3 w-3 text-violet-500" />
                        {group.locations.length} location{group.locations.length !== 1 ? 's' : ''}
                      </span>
                      <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Users className="h-3 w-3 text-violet-500" />
                        {group.contacts.length} contact{group.contacts.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {group.contacts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {group.contacts.slice(0, 3).map(c => (
                          <Badge
                            key={c.id}
                            variant="outline"
                            className={`text-[10px] py-0 ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-200 text-slate-500'}`}
                          >
                            {c.contact}
                          </Badge>
                        ))}
                        {group.contacts.length > 3 && (
                          <Badge variant="outline" className={`text-[10px] py-0 ${isDark ? 'border-slate-600 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                            +{group.contacts.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>


      <ERPFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={editRecord ? handleUpdate : handleCreate}
        loading={isSaving}
        isDark={isDark}
        editRecord={editRecord}
      />

      <LocationGroupFormDialog
        open={groupDialogOpen}
        onClose={() => { setGroupDialogOpen(false); setEditGroup(null) }}
        onSubmit={handleGroupSubmit}
        loading={groupsSaving}
        isDark={isDark}
        editRecord={editGroup}
        allErps={data}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? 'text-white' : ''}>{t('erp.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-slate-400' : ''}>
              {t('erp.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : ''}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteGroup} onOpenChange={(open) => !open && setDeleteGroup(null)}>
        <AlertDialogContent className={isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? 'text-white' : ''}>{t('erp.locationGroup.deleteDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-slate-400' : ''}>
              {t('erp.locationGroup.deleteDialogDescription', { name: deleteGroup?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : ''}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGroupDelete} className="bg-red-600 text-white hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
