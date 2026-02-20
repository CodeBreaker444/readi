'use client'

import { AssignmentForm, AssignmentModal } from '@/components/organization/AssignmentUi'
import { getAssignmentColumns } from '@/components/tables/AssignmentColumn'
import { TablePagination } from '@/components/tables/Pagination'
import { useTheme } from '@/components/useTheme'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { HiPlus, HiRefresh, HiSearch } from 'react-icons/hi'
import { toast } from 'sonner'

type FormData = {
  assignment_code: string
  assignment_ver: string
  assignment_active: 'Y' | 'N'
  assignment_desc: string
  assignment_json: string
}

const emptyForm: FormData = {
  assignment_code: '',
  assignment_ver: '1.0',
  assignment_active: 'Y',
  assignment_desc: '',
  assignment_json: '',
}
export default function AssignmentPage() {
  const { isDark } = useTheme()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [previewItem, setPreviewItem] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/organization/assignment')
      const rawData = res.data
      const dataArray = Object.keys(rawData)
        .filter(key => !isNaN(Number(key)))
        .map(key => rawData[key])

      setAssignments(dataArray)
    } catch {
      toast.error('Failed to load assignments')
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const columns = useMemo(() => getAssignmentColumns(
    isDark,
    (item) => setEditItem(item),
    (item) => setPreviewItem(item),
    (item) => setConfirmDelete(item)
  ), [isDark])

  const table = useReactTable({
    data: assignments,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  })


const handleCreate = async (form: FormData) => {
  setSubmitting(true)
  try {
    const res = await axios.post('/api/organization/assignment', form)
    
    if (res.status === 201) {
      const newItem = res.data?.data 
      
      if (newItem) {
        setAssignments((prev) => [newItem, ...prev])
        setAddOpen(false)
        toast.success('Assignment created')
      } else {
        load()
      }
    }
  } catch (err: any) {
    const msg = err.response?.data?.message ?? 'Creation failed'
    toast.error(msg)
  } finally {
    setSubmitting(false)
  }
}

  const handleUpdate = async (form: FormData) => {
    if (!editItem) return
    setSubmitting(true)
    try {
      const res = await axios.put(`/api/organization/assignment/${editItem.assignment_id}`, form)
      if (res.status === 200) {
        const updated = res.data?.data ?? res.data?.result?.data ?? { ...editItem, ...form }
        setAssignments(prev => prev.map(item => item.assignment_id === editItem.assignment_id ? updated : item))
        setEditItem(null)
        toast.success('Assignment updated')
      }
    } catch { toast.error('Update failed') }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setSubmitting(true)
    try {
      const res = await axios.delete(`/api/organization/assignment/${confirmDelete.assignment_id}`)
      if (res.status === 200) {
        setAssignments(prev => prev.filter(a => a.assignment_id !== confirmDelete.assignment_id))
        setConfirmDelete(null)
        toast.success('Assignment deleted')
      }
    } catch { toast.error('Deletion failed') }
    setSubmitting(false)
  }

  const editInitial: FormData = editItem
    ? {
      assignment_code: editItem.assignment_code ?? '',
      assignment_ver: String(editItem.assignment_ver ?? '1.0'),
      assignment_active: (editItem.assignment_active as 'Y' | 'N') ?? 'Y',
      assignment_desc: editItem.assignment_desc ?? '',
      assignment_json: editItem.assignment_json
        ? JSON.stringify(editItem.assignment_json, null, 2)
        : '',
    }
    : emptyForm

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
      <div className="mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Assignments</h1>
          <div className="flex gap-2">
            <button onClick={load} className={`h-9 px-4 rounded-lg border flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'} transition-all`}><HiRefresh className={loading ? 'animate-spin' : ''} /> Sync</button>
            <button onClick={() => setAddOpen(true)} className="h-9 px-4 rounded-lg bg-blue-600 text-white flex items-center gap-2"><HiPlus /> Add Assignment</button>
          </div>
        </div>

        <div className="relative mb-4">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search assignments..."
            className={`w-full h-10 pl-9 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          />
        </div>

        <div className={`rounded-xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'} border-b uppercase text-xs font-semibold`}>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(header => (
                      <th key={header.id} className="px-4 py-3 text-left">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`skeleton-row-${rowIndex}`}>
                      {Array.from({ length: 7 }).map((_, cellIndex) => (
                        <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-4">
                          <div
                            className={`h-4 rounded animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-200'
                              }`}
                            style={{
                              width: cellIndex === 0 ? '20px' : cellIndex === 2 ? '80%' : '60%',
                              opacity: 1 - cellIndex * 0.1,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-20 text-center text-slate-500 italic"
                    >
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <TablePagination table={table} />
      </div>


      <AssignmentModal open={addOpen} title="Add Assignment" onClose={() => setAddOpen(false)} isDark={isDark}>
        <AssignmentForm
          initial={emptyForm}
          onSubmit={handleCreate}
          loading={submitting}
          submitLabel="Create Assignment"
          isDark={isDark}
        />
      </AssignmentModal>

      <AssignmentModal
        open={!!editItem}
        title={`Edit — ${editItem?.assignment_code}`}
        onClose={() => setEditItem(null)}
        isDark={isDark}
      >
        <AssignmentForm
          initial={editInitial}
          onSubmit={handleUpdate}
          loading={submitting}
          submitLabel="Save Changes"
          isDark={isDark}
        />
      </AssignmentModal>

      <AssignmentModal
        open={!!previewItem}
        title={`JSON Schema — ${previewItem?.assignment_code}`}
        onClose={() => setPreviewItem(null)}
        isDark={isDark}
      >
        <pre
          className={`rounded-lg p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-[60vh] whitespace-pre-wrap ${isDark ? 'bg-slate-950 text-blue-400' : 'bg-slate-50 text-blue-700'
            }`}
        >
          {previewItem?.assignment_json
            ? JSON.stringify(previewItem.assignment_json, null, 2)
            : '// No schema defined'}
        </pre>
      </AssignmentModal>

      <AssignmentModal
        open={!!confirmDelete}
        title="Delete Assignment"
        onClose={() => setConfirmDelete(null)}
        isDark={isDark}
      >
        <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Permanently delete{' '}
          <span className={`font-semibold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {confirmDelete?.assignment_code}
          </span>
          ? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setConfirmDelete(null)}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors ${isDark
              ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
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
      </AssignmentModal>
    </div>
  )
}