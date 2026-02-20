import { Badge } from '@/components/organization/ChecklistUi'
import { Checklist } from '@/config/types/checklist'
import { ColumnDef } from '@tanstack/react-table'
import { HiPencilAlt, HiPlay, HiTrash } from 'react-icons/hi'

export const getColumns = (
  isDark: boolean,
  onEdit: (item: Checklist) => void,
  onPreview: (item: Checklist) => void,
  onDelete: (item: Checklist) => void
): ColumnDef<Checklist>[] => [
  {
    accessorKey: 'id_index',
    header: '#',
    cell: ({ row }) => <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>{row.index + 1}</span>,
  },
  {
    accessorKey: 'checklist_code',
    header: 'Code',
    cell: ({ row }) => (
      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-mono font-semibold${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {row.original.checklist_code}
      </span>
    ),
  },
  {
    accessorKey: 'checklist_desc',
    header: 'Description',
    cell: ({ row }) => (
      <div className={`max-w-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {row.original.checklist_desc}
      </div>
    ),
  },
  {
    accessorKey: 'checklist_ver',
    header: 'Ver',
    cell: ({ row }) => <span className="font-mono text-xs italic">v{row.original.checklist_ver ?? '1.0'}</span>,
  },
  {
    accessorKey: 'checklist_active',
    header: 'Status',
    cell: ({ row }) => <Badge active={row.original.checklist_active} />,
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
      const c = row.original
      return (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(c)}
            className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
          >
            <HiPencilAlt size={16} />
          </button>
          <button
            onClick={() => onPreview(c)}
            className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
          >
            <HiPlay size={16} />
          </button>
          {c.checklist_active === 'N' && (
            <button
              onClick={() => onDelete(c)}
              className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`}
            >
              <HiTrash size={16} />
            </button>
          )}
        </div>
      )
    },
  },
]