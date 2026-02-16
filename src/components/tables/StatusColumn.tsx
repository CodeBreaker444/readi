import { Mission } from '@/config/types';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

export const createMissionStatusColumns = (
  isDark: boolean,
  onEdit: (status: Mission) => void,
  onDelete: (id: number) => void
): ColumnDef<Mission>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <div className="font-medium">{row.original.id}</div>,
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <div className={cn('font-mono text-sm', isDark ? 'text-blue-400' : 'text-blue-600')}>
        {row.original.code}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className={cn('font-medium', isDark ? 'text-slate-200' : 'text-gray-900')}>
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
        {row.original.description || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'order',
    header: 'Order',
    cell: ({ row }) => (
      <div className="text-center text-sm">{row.original.order || 0}</div>
    ),
  },
  {
    accessorKey: 'isFinalStatus',
    header: 'Final',
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row.original.isFinalStatus ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
            No
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <button
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
          )}
          onClick={() => onEdit(row.original)}
        >
          <Pencil size={16} /> Edit
        </button>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors"
          onClick={() => {
              onDelete(row.original.id);
          }}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    ),
  },
];