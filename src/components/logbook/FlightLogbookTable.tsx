'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { flightBookColumns } from './FlightBookColumn';

export interface Mission {
  id: number;
  startDate: string;
  endDate: string;
  pic: string;
  client: string;
  missionCategory: string;
  missionType: string;
  droneSystem: string;
  missionStatus: string;
  missionResult: string;
  missionPlan: string;
  minFlown: number;
  meterFlown: number;
  picNotes: string;
  group: string;
}

interface FlightLogbookTableProps {
  ownerId: number;
  filters: any;
  onRowClick: (mission: Mission) => void;
}

// Sample mission data
const SAMPLE_MISSIONS: Mission[] = [
  {
    id: 1,
    startDate: '2024-02-01 09:30',
    endDate: '2024-02-01 11:45',
    pic: 'John Anderson',
    client: 'City Planning Department',
    missionCategory: 'Commercial',
    missionType: 'Survey & Mapping',
    droneSystem: 'DJI Phantom 4 Pro',
    missionStatus: 'Completed',
    missionResult: 'Success',
    missionPlan: 'Urban Mapping 2024',
    minFlown: 135,
    meterFlown: 8450,
    picNotes: 'Clear weather conditions, excellent visibility',
    group: 'Team Alpha',
  },
  {
    id: 2,
    startDate: '2024-02-02 14:00',
    endDate: '2024-02-02 15:30',
    pic: 'Sarah Mitchell',
    client: 'Infrastructure Group',
    missionCategory: 'Commercial',
    missionType: 'Inspection',
    droneSystem: 'DJI Mavic 3 Enterprise',
    missionStatus: 'Completed',
    missionResult: 'Success',
    missionPlan: 'Infrastructure Inspection',
    minFlown: 90,
    meterFlown: 5200,
    picNotes: 'Bridge inspection completed successfully',
    group: 'Team Beta',
  },
  {
    id: 3,
    startDate: '2024-02-03 08:15',
    endDate: '2024-02-03 09:00',
    pic: 'Michael Chen',
    client: 'Agricultural Solutions Inc',
    missionCategory: 'Research',
    missionType: 'Aerial Photography',
    droneSystem: 'Autel EVO II Pro',
    missionStatus: 'Completed',
    missionResult: 'Success',
    missionPlan: 'Agricultural Survey',
    minFlown: 45,
    meterFlown: 3100,
    picNotes: 'Crop health monitoring completed',
    group: 'Team Alpha',
  },
  {
    id: 4,
    startDate: '2024-02-03 13:00',
    endDate: '2024-02-03 13:45',
    pic: 'Emma Rodriguez',
    client: 'Green Energy Corp',
    missionCategory: 'Commercial',
    missionType: 'Inspection',
    droneSystem: 'Parrot Anafi USA',
    missionStatus: 'Completed',
    missionResult: 'Partial Success',
    missionPlan: 'Infrastructure Inspection',
    minFlown: 45,
    meterFlown: 2800,
    picNotes: 'Wind conditions challenging, limited some coverage',
    group: 'Team Beta',
  },
  {
    id: 5,
    startDate: '2024-02-04 10:00',
    endDate: '2024-02-04 12:30',
    pic: 'John Anderson',
    client: 'City Planning Department',
    missionCategory: 'Commercial',
    missionType: 'Survey & Mapping',
    droneSystem: 'DJI Phantom 4 Pro',
    missionStatus: 'In Progress',
    missionResult: 'Pending',
    missionPlan: 'Urban Mapping 2024',
    minFlown: 0,
    meterFlown: 0,
    picNotes: 'Mission scheduled',
    group: 'Team Alpha',
  },
];

export default function FlightLogbookTable({
  ownerId,
  filters,
  onRowClick,
}: FlightLogbookTableProps) {
  const [data, setData] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8,
  });

  useEffect(() => {
    loadMissionData();
  }, [ownerId, filters]);

  useEffect(() => {
    const handleFilterChange = () => {
      loadMissionData();
    };
    window.addEventListener('logbook-filters-changed', handleFilterChange);
    return () => {
      window.removeEventListener('logbook-filters-changed', handleFilterChange);
    };
  }, []);

  const loadMissionData = async () => {
    setLoading(true);
    try {
      // Simulate API call with sample data
      await new Promise((resolve) => setTimeout(resolve, 500));
      setData(SAMPLE_MISSIONS);

      // Uncomment when API is ready:
      /*
      const response = await fetch('/api/missions/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ...filters }),
      });
      const result = await response.json();
      setData(result.data || []);
      */
    } catch (error) {
      console.error('Error loading mission data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const table = useReactTable<Mission>({
    data,
    columns: flightBookColumns,
    state: {
      sorting,
      pagination
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading flight records...
          </p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No flight records found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row.original)}
                className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing{' '}
            <span className="font-medium">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            of{' '}
            <span className="font-medium">
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            results
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}