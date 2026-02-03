import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Clock } from "lucide-react";
import { Mission } from "./FlightLogbookTable";

    const getStatusBadge = (status: string) => {
    const styles = {
      Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      Pending: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
      Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status as keyof typeof styles] || styles.Pending;
  };

  const getResultBadge = (result: string) => {
    const styles = {
      Success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Partial Success': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      Failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      Aborted: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
      Pending: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return styles[result as keyof typeof styles] || styles.Pending;
  };

 export const flightBookColumns: ColumnDef<Mission>[] = [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-slate-700 dark:hover:text-slate-300"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          #
          <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.getValue('id')}
        </span>
      ),
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => (
        <button
          className="flex items-center gap-2 font-semibold hover:text-slate-700 dark:hover:text-slate-300"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Start Time
          <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {row.getValue('startDate')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'endDate',
      header: 'End Time',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {row.getValue('endDate')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'pic',
      header: 'PiC',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.getValue('pic')}
        </span>
      ),
    },
    {
      accessorKey: 'client',
      header: 'Client',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.getValue('client')}
        </span>
      ),
    },
    {
      accessorKey: 'missionType',
      header: 'Mission Type',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.getValue('missionType')}
        </span>
      ),
    },
    {
      accessorKey: 'droneSystem',
      header: 'Drone System',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.getValue('droneSystem')}
        </span>
      ),
    },
    {
      accessorKey: 'missionStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('missionStatus') as string;
        return (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
              status
            )}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'missionResult',
      header: 'Result',
      cell: ({ row }) => {
        const result = row.getValue('missionResult') as string;
        return (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getResultBadge(
              result
            )}`}
          >
            {result}
          </span>
        );
      },
    },
    {
      accessorKey: 'minFlown',
      header: 'Duration (min)',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.getValue('minFlown')}
        </span>
      ),
    },
    {
      accessorKey: 'meterFlown',
      header: 'Distance (m)',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.getValue('meterFlown')}
        </span>
      ),
    },
  ];