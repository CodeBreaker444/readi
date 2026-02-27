'use client'

import { ChecklistForm, Modal } from '@/components/organization/ChecklistUi';
import { getColumns } from '@/components/tables/CheckListColumn';
import { TablePagination } from '@/components/tables/Pagination';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/useTheme';
import type { Checklist } from '@/config/types/checklist';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiPlus,
  HiRefresh,
  HiSearch
} from 'react-icons/hi';
import { toast } from 'sonner';

type FormData = {
  checklist_code: string
  checklist_ver: string
  checklist_active: 'Y' | 'N'
  checklist_desc: string
  checklist_json: string
}

const emptyForm: FormData = {
  checklist_code: '',
  checklist_ver: '1.0',
  checklist_active: 'Y',
  checklist_desc: '',
  checklist_json: '',
}

export default function ChecklistPage() {
  const { isDark } = useTheme();
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Checklist | null>(null)
  const [previewItem, setPreviewItem] = useState<Checklist | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Checklist | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [globalFilter, setGlobalFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/organization/checklist')

      setChecklists(res.data.data ?? [])
    } catch (error) {
      toast.error('Failed to load checklists')
      setChecklists([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const columns = useMemo(() => getColumns(
    isDark,
    (item) => setEditItem(item),
    (item) => setPreviewItem(item),
    (item) => setConfirmDelete(item)
  ), [isDark]);

  const table = useReactTable({
    data: checklists,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const handleCreate = async (form: FormData) => {
    setSubmitting(true)
    try {
      const res = await axios.post('/api/organization/checklist', form)
      if (res.status === 201) { setAddOpen(false); load(); toast.success('Checklist created') }
    } catch { toast.error('Creation failed') }
    setSubmitting(false)
  }

  const handleUpdate = async (form: FormData) => {
    if (!editItem) return
    setSubmitting(true)
    try {
      const res = await axios.put(`/api/organization/checklist/${editItem.checklist_id}`, form)
      if (res.status === 200) { setEditItem(null); load(); toast.success('Checklist updated') }
    } catch { toast.error('Update failed') }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setSubmitting(true)
    try {
      const res = await axios.delete(`/api/organization/checklist/${confirmDelete.checklist_id}`)
      if (res.status === 200) { setConfirmDelete(null); load(); toast.success('Checklist deleted') }
    } catch { toast.error('Deletion failed') }
    setSubmitting(false)
  }

  const safeChecklists = Array.isArray(checklists) ? checklists : []

  const filtered = safeChecklists.filter(c =>
    !search ||
    c.checklist_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.checklist_desc?.toLowerCase().includes(search.toLowerCase())
  )

  const editInitial: FormData = editItem ? {
    checklist_code: editItem.checklist_code ?? '',
    checklist_ver: String(editItem.checklist_ver ?? '1.0'),
    checklist_active: (editItem.checklist_active as 'Y' | 'N') ?? 'Y',
    checklist_desc: editItem.checklist_desc ?? '',
    checklist_json: editItem.checklist_json ? JSON.stringify(editItem.checklist_json, null, 2) : '',
  } : emptyForm


  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
      <div className="mx-auto">

        <div className={`top-0 z-10 backdrop-blur-md transition-colors w-full ${isDark
            ? "bg-slate-900/80 border-b border-slate-800 text-white"
            : "bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          } px-6 py-4 mb-8`}>
          <div className="mx-auto max-w-[1800px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />
              <div>
                <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Checklists
                </h1>
                <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Manage and organize your operational checklist items
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className={`h-8 gap-1.5 text-xs transition-all ${isDark
                    ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <HiRefresh className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
              >
                <HiPlus className="h-3.5 w-3.5" />
                Add Checklist
              </Button>
            </div>
          </div>
        </div>

        <div className="relative mb-4 mx-3">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search all columns..."
            className={`w-full h-10 pl-9 pr-4 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
          />
        </div>

        <div className={`rounded-xl mx-3 border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className={`border-b text-xs uppercase tracking-wider ${isDark ? 'border-slate-800 bg-slate-800/50 text-slate-500' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 text-left font-semibold">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                {loading ? (
                  <tr><td colSpan={columns.length} className="py-10 text-center animate-pulse">Loading data...</td></tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr><td colSpan={columns.length} className="py-20 text-center text-slate-500 italic">No results found.</td></tr>
                ) : table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <TablePagination table={table} />
      </div>

      <Modal open={addOpen} title="Add Checklist" onClose={() => setAddOpen(false)} isDark={isDark}>
        <ChecklistForm initial={emptyForm} onSubmit={handleCreate} loading={submitting} submitLabel="Create Checklist" isDark={isDark} />
      </Modal>

      <Modal open={!!editItem} title={`Edit — ${editItem?.checklist_code}`} onClose={() => setEditItem(null)} isDark={isDark}>
        <ChecklistForm initial={editInitial} onSubmit={handleUpdate} loading={submitting} submitLabel="Save Changes" isDark={isDark} />
      </Modal>

      <Modal open={!!previewItem} title={`JSON Schema — ${previewItem?.checklist_code}`} onClose={() => setPreviewItem(null)} isDark={isDark}>
        <pre className={`rounded-lg p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-[60vh] whitespace-pre-wrap ${isDark ? 'bg-slate-950 text-blue-400' : 'bg-slate-50 text-blue-700'}`}>
          {previewItem?.checklist_json ? JSON.stringify(previewItem.checklist_json, null, 2) : '// No schema defined'}
        </pre>
      </Modal>

      <Modal open={!!confirmDelete} title="Delete Checklist" onClose={() => setConfirmDelete(null)} isDark={isDark}>
        <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Permanently delete <span className={`font-semibold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{confirmDelete?.checklist_code}</span>? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setConfirmDelete(null)}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}