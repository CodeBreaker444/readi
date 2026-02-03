'use client';

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';

interface Mission {
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

export default function FlightLogbookTable({
  ownerId,
  filters,
  onRowClick,
}: FlightLogbookTableProps) {
  const [data, setData] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch('/api/missions/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ...filters }),
      });
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error loading mission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<Mission>[] = [
    { accessorKey: 'id', header: '#' },
    { accessorKey: 'startDate', header: 'Start (Local Time)' },
    { accessorKey: 'endDate', header: 'End (Local Time)' },
    { accessorKey: 'pic', header: 'PiC' },
    { accessorKey: 'client', header: 'Client' },
    { accessorKey: 'missionCategory', header: 'Mission Category' },
    { accessorKey: 'missionType', header: 'Mission Type' },
    { accessorKey: 'droneSystem', header: 'Drone System' },
    { accessorKey: 'missionStatus', header: 'Mission Status' },
    { accessorKey: 'missionResult', header: 'Mission Result' },
    { accessorKey: 'missionPlan', header: 'Mission Plan' },
    { accessorKey: 'minFlown', header: 'Min Flown' },
    { accessorKey: 'meterFlown', header: 'Meter Flown' },
    { accessorKey: 'picNotes', header: 'PiC Notes' },
    { accessorKey: 'group', header: 'Group' },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return <div>Loading missions...</div>;
  }

  return (
    <div className="table-responsive">
      <table id="missionTableData" className="table table-striped">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
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
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              style={{ cursor: 'pointer' }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="btn btn-sm btn-outline-secondary"
        >
          Previous
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="btn btn-sm btn-outline-secondary"
        >
          Next
        </button>
      </div>
    </div>
  );
}