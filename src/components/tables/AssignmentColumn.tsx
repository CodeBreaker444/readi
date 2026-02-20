import { Assignment } from '@/backend/services/organization/assignment/assignment-service'
import { ColumnDef } from '@tanstack/react-table'
import { HiPencilAlt, HiPlay, HiTrash } from 'react-icons/hi'
import { Badge } from '../organization/ChecklistUi'

export const getAssignmentColumns = (
  isDark: boolean,
  onEdit: (item: Assignment) => void,
  onPreview: (item: Assignment) => void,
  onDelete: (item: Assignment) => void
): ColumnDef<Assignment>[] => [
  {
    header: '#',
    cell: ({ row }) => <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>{row.index + 1}</span>,
  },
  {
    accessorKey: 'assignment_code',
    header: 'Code',
    cell: ({ row }) => (
      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {row.original.assignment_code}
      </span>
    ),
  },
  {
    accessorKey: 'assignment_desc',
    header: 'Description',
    cell: ({ row }) => (
      <div className={`max-w-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {row.original.assignment_desc}
      </div>
    ),
  },
  {
    accessorKey: 'assignment_ver',
    header: 'Ver',
    cell: ({ row }) => <span className="font-mono text-xs italic">v{row.original.assignment_ver ?? '1.0'}</span>,
  },
  {
    accessorKey: 'assignment_active',
    header: 'Status',
    cell: ({ row }) => <Badge active={row.original.assignment_active} />,
  },
  {
    accessorKey: 'updated_at',
    header: 'Last Updated',
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.updated_at ? new Date(row.original.updated_at).toLocaleDateString('en-GB') : '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const a = row.original
      return (
        <div className="flex items-center gap-1.5">
          <button onClick={() => onEdit(a)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}>
            <HiPencilAlt size={16} />
          </button>
          <button onClick={() => onPreview(a)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}>
            <HiPlay size={16} />
          </button>
          {a.assignment_active === 'N' && (
            <button onClick={() => onDelete(a)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`}>
              <HiTrash size={16} />
            </button>
          )}
        </div>
      )
    },
  },
]