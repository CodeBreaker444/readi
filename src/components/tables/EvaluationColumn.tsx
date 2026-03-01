'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Evaluation } from '@/config/types/evaluation';
import { Column, ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { ResultBadge, StatusBadge } from '../planning/StatusBadge';

export const getEvaluationColumns = (
  onView?: (evaluation: Evaluation) => void,
  onDelete?: (evaluation: Evaluation) => void
): ColumnDef<Evaluation>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="rounded border-slate-300 cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="rounded border-slate-300 cursor-pointer"
      />
    ),
    size: 36,
  },
  {
    accessorKey: 'evaluation_year',
    header: ({ column }) => <SortableHeader column={column} label="Year" />,
    cell: ({ getValue }) => <span className="font-mono text-xs text-slate-500">{getValue() as number}</span>,
    size: 60,
  },
  {
    accessorKey: 'evaluation_id',
    header: ({ column }) => <SortableHeader column={column} label="#" />,
    cell: ({ getValue }) => <span className="font-mono text-xs font-medium">EVAL_{getValue() as number}</span>,
    size: 80,
  },
  {
    accessorKey: 'client_name',
    header: ({ column }) => <SortableHeader column={column} label="Client" />,
    cell: ({ getValue }) => <span className="font-medium text-sm">{getValue() as string}</span>,
  },
  {
    accessorKey: 'evaluation_status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue() as any} />,
    size: 110,
  },
  {
    accessorKey: 'evaluation_result',
    header: 'Result',
    cell: ({ getValue }) => <ResultBadge result={getValue() as any} />,
    size: 110,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const ev = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(ev)}>
              <Eye className="mr-2 h-4 w-4" /> View / Edit
            </DropdownMenuItem>
            {ev.evaluation_status === 'NEW' && (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete?.(ev)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 48,
  },
];

function SortableHeader({
  column,
  label,
}: {
  column: Column<Evaluation, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
      onClick={() => column.toggleSorting()}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 text-slate-300" />
      )}
    </button>
  );
}