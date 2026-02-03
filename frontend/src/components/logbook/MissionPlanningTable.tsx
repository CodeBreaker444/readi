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

interface MissionPlanning {
  id: number;
  client: string;
  evaluation: string;
  planning: string;
  pic: string;
  lastUpdate: string;
  // Add other fields as needed
}

interface MissionPlanningTableProps {
  ownerId: number;
  filters: any;
}

export default function MissionPlanningTable({
  ownerId,
  filters,
}: MissionPlanningTableProps) {
  const [data, setData] = useState<MissionPlanning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissionPlanningData();
  }, [ownerId, filters]);

  useEffect(() => {
    const handleFilterChange = () => {
      loadMissionPlanningData();
    };
    window.addEventListener('mission-planning-filters-changed', handleFilterChange);
    return () => {
      window.removeEventListener('mission-planning-filters-changed', handleFilterChange);
    };
  }, []);

  const loadMissionPlanningData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/planning/template-logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ...filters }),
      });
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error loading mission planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<MissionPlanning>[] = [
    { accessorKey: 'id', header: '#' },
    { accessorKey: 'client', header: 'Client' },
    { accessorKey: 'evaluation', header: 'Evaluation' },
    { accessorKey: 'planning', header: 'Planning' },
    { accessorKey: 'pic', header: 'PiC' },
    { accessorKey: 'lastUpdate', header: 'Last Update' },
    // Add more columns as needed
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
    return <div>Loading mission planning data...</div>;
  }

  return (
    <div className="table-responsive">
      <table id="missionPlanningTemplateTableData" className="table table-striped">
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
            <tr key={row.id}>
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