import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

  export interface MissionPlanning {
  id: number;
  client: string;
  evaluation: string;
  planning: string;
  pic: string;
  lastUpdate: string;
}

  export const columns: ColumnDef<MissionPlanning>[] = [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          #
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.getValue('id')}
        </span>
      ),
    },
    {
      accessorKey: 'client',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Client
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.getValue('client')}
        </span>
      ),
    },
    {
      accessorKey: 'evaluation',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Evaluation
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.getValue('evaluation')}
        </span>
      ),
    },
    {
      accessorKey: 'planning',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Planning
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.getValue('planning')}
        </span>
      ),
    },
    {
      accessorKey: 'pic',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          PiC
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.getValue('pic')}
        </span>
      ),
    },
    {
      accessorKey: 'lastUpdate',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Last Update
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('lastUpdate'));
        return (
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        );
      },
    },
  ];