'use client';

import {
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Upload,
  Wrench
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import GeneralCommunicationDialog from '@/components/operation/GeneralCommunicationDialog';
import ImportOperationDialog from '@/components/operation/ImportOperationDialog';
import {
  AttachmentsDialog,
  DeleteDialog,
  OperationDialog,
} from '@/components/operation/OperationDialogs';
import { operationColumns, OperationTableMeta } from '@/components/tables/OperationColumn';
import { TablePagination } from '@/components/tables/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { toast } from 'sonner';

export interface Operation {
  pilot_mission_id: number;
  mission_code: string;
  mission_name: string;
  mission_description?: string | null;
  scheduled_start?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  flight_duration?: number | null;
  location?: string | null;
  distance_flown?: number | null;
  max_altitude?: number | null;
  notes?: string | null;
  fk_pilot_user_id: number;
  fk_tool_id?: number | null;
  fk_mission_status_id?: number | null;
  fk_planning_id?: number | null;
  pilot_name?: string | null;
  tool_code?: string | null;
  status_name?: string | null;
  created_at: string;
  updated_at: string;
}

interface FilterState {
  search: string;
  statusFilter: string;
  pilotFilter: string;
  dateStart: string;
  dateEnd: string;
}
 

function SortIndicator({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (!isSorted) return <span className="ml-1 text-muted-foreground/40">↕</span>;
  return <span className="ml-1">{isSorted === 'asc' ? '↑' : '↓'}</span>;
}


export default function OperationsPage() {
  const { isDark } = useTheme();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Operation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Operation | null>(null);
  const [attachTarget, setAttachTarget] = useState<Operation | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statusFilter: 'ALL',
    pilotFilter: 'ALL',
    dateStart: '',
    dateEnd: '',
  });
  const [pilots, setPilots] = useState<
    { user_id: number; first_name: string; last_name: string }[]
  >([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  useEffect(() => {
    const fetchOperations = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.statusFilter !== 'ALL') params.set('status', filters.statusFilter);
        if (filters.pilotFilter !== 'ALL') params.set('pilot_id', filters.pilotFilter);
        if (filters.dateStart) params.set('date_start', filters.dateStart);
        if (filters.dateEnd) params.set('date_end', filters.dateEnd);

        const [opsRes, optRes] = await Promise.all([
          axios.get(`/api/operation?${params.toString()}`),
          optionsLoaded ? Promise.resolve(null) : axios.get('/api/operation/options'),
        ]);

        setOperations(opsRes.data.data ?? []);

        if (optRes) {
          setPilots(optRes.data.pilots ?? []);
          setOptionsLoaded(true);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchOperations();
  }, [filters]);

  const tableMeta = useMemo<OperationTableMeta>(
    () => ({
      onEdit: (op) => setEditTarget(op),
      onAttach: (op) => setAttachTarget(op),
      onDelete: (op) => setDeleteTarget(op),
    }),
    []
  );

  const table = useReactTable({
    data: operations,
    columns: operationColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => String(row.pilot_mission_id),
    meta: tableMeta,
  });

  function handleSaved(op: Operation) {
    setOperations((prev) => {
      const idx = prev.findIndex((o) => o.pilot_mission_id === op.pilot_mission_id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...op };
        return next;
      }
      return [op, ...prev];
    });
  }

  function handleDeleted(id: number) {
    setOperations((prev) => prev.filter((o) => o.pilot_mission_id !== id));
  }

  const stats = {
    total: operations.length,
    planned: operations.filter((o) => o.status_name === 'PLANNED').length,
    inProgress: operations.filter((o) => o.status_name === 'IN_PROGRESS').length,
    completed: operations.filter((o) => o.status_name === 'COMPLETED').length,
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="mx-auto">
            <div
              className={`top-0 z-10 backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/80 border-b border-slate-800 text-white'
                  : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              } px-6 py-4 mb-8`}
            >
              <div className="mx-auto max-w-[1800px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full bg-violet-600" />
                  <div>
                    <h1
                      className={`font-semibold text-base tracking-tight ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Operations
                    </h1>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Pilot missions &amp; flight operations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCommOpen(true)}
                    className={`h-8 gap-1.5 text-xs ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Communication
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportOpen(true)}
                    className={`h-8 gap-1.5 text-xs ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Operation
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 p-4 gap-3">
              {[
                { label: 'Total', value: stats.total, color: 'text-foreground' },
                { label: 'Planned', value: stats.planned, color: 'text-blue-600' },
                { label: 'In Progress', value: stats.inProgress, color: 'text-violet-600' },
                { label: 'Completed', value: stats.completed, color: 'text-emerald-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-muted/30 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-8 w-12" />
                  ) : (
                    <p className={cn('text-2xl font-bold tabular-nums', s.color)}>
                      {s.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b px-6 py-4">
          <div className="mx-auto space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search operations…"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  className="pl-8"
                />
              </div>

              <Select
                value={filters.statusFilter}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, statusFilter: v }))
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="ABORTED">Aborted</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.pilotFilter}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, pilotFilter: v }))
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Pilots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Pilots</SelectItem>
                  {pilots.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id.toString()}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={filters.dateStart}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateStart: e.target.value }))
                }
                className="w-36 text-sm"
                placeholder="From"
              />
              <Input
                type="date"
                value={filters.dateEnd}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateEnd: e.target.value }))
                }
                className="w-36 text-sm"
                placeholder="To"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    search: '',
                    statusFilter: 'ALL',
                    pilotFilter: 'ALL',
                    dateStart: '',
                    dateEnd: '',
                  })
                }
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>

              <span className="ml-auto text-sm text-muted-foreground">
                {loading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  `${operations.length} operations`
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto px-6 py-4">
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="bg-muted/40 hover:bg-muted/40"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'whitespace-nowrap',
                          header.column.getCanSort() && 'cursor-pointer select-none'
                        )}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <SortIndicator isSorted={header.column.getIsSorted()} />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Skeleton className="h-7 w-7 rounded-md" />
                          <Skeleton className="h-7 w-7 rounded-md" />
                          <Skeleton className="h-7 w-7 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={operationColumns.length}
                      className="py-16 text-center text-muted-foreground"
                    >
                      <Wrench className="mx-auto mb-2 h-8 w-8 opacity-25" />
                      <p className="text-sm">No operations found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="group">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
            <TablePagination table={table} />
        </div>
      </div>

      <OperationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={handleSaved}
      />
      <OperationDialog
        open={!!editTarget}
        initial={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={handleSaved}
      />
      <DeleteDialog
        open={!!deleteTarget}
        operation={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
      {attachTarget && (
        <AttachmentsDialog
          open={!!attachTarget}
          operationId={attachTarget.pilot_mission_id}
          operationName={attachTarget.mission_name}
          onClose={() => setAttachTarget(null)}
        />
      )}

      <ImportOperationDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSaved={handleSaved}
      />
      <GeneralCommunicationDialog
        open={commOpen}
        onClose={() => setCommOpen(false)}
      />
    </TooltipProvider>
  );
}