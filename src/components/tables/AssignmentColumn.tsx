import { Assignment } from '@/backend/services/organization/assignment-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Pencil, Play, Trash2 } from 'lucide-react'

export const getAssignmentColumns = (
  isDark: boolean,
  onEdit: (item: Assignment) => void,
  onPreview: (item: Assignment) => void,
  onDelete: (item: Assignment) => void
): ColumnDef<Assignment>[] => [
  {
    id: 'index',
    header: '#',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
        {String(row.index + 1).padStart(3, '0')}
      </span>
    ),
    size: 50,
  },
  {
    accessorKey: 'assignment_code',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-black hover:text-slate-800 dark:text-slate-200"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Code
        <ArrowUpDown className="ml-1.5 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-[11px] font-semibold text-violet-600 dark:text-violet-400">
        {row.original.assignment_code}
      </span>
    ),
    size: 130,
  },
  {
    accessorKey: 'assignment_desc',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 max-w-[220px] block">
        {row.original.assignment_desc || '—'}
      </span>
    ),
    size: 240,
  },
  {
    accessorKey: 'assignment_ver',
    header: 'Version',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 italic">
        v{row.original.assignment_ver ?? '1.0'}
      </span>
    ),
    size: 75,
  },
  {
    accessorKey: 'assignment_active',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.original.assignment_active === 'Y'
      return (
        <Badge
          variant="outline"
          className={`text-[10px] border font-semibold tracking-wider uppercase rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5 ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400'
              : 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:text-slate-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    size: 100,
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-black hover:text-slate-800 dark:text-slate-200"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Last Updated
        <ArrowUpDown className="ml-1.5 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs text-slate-600 dark:text-slate-300">
        {row.original.updated_at
          ? new Date(row.original.updated_at).toLocaleDateString('en-GB')
          : <span className="text-slate-300 dark:text-slate-600">—</span>
        }
      </span>
    ),
    size: 120,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const a = row.original
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(a)}
            className="cursor-pointer p-1.5 rounded-lg transition-colors text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/15"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onPreview(a)}
            className="cursor-pointer p-1.5 rounded-lg transition-colors text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
            title="Preview"
          >
            <Play size={14} />
          </button>
          {a.assignment_active === 'N' && (
            <button
              onClick={() => onDelete(a)}
              className="cursor-pointer p-1.5 rounded-lg transition-colors text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/15"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    },
    size: 100,
  },
]