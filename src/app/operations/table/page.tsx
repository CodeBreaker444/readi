'use client';

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Briefcase,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  User,
  Wand2,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import GeneralCommunicationDialog from '@/components/operation/GeneralCommunicationDialog';
import ImportOperationDialog from '@/components/operation/ImportOperationDialog';
import { MaintenanceCycleModal } from '@/components/operation/MaintenanceCycleModal';
import {
  AttachmentsDialog,
  DeleteDialog,
  OperationDialog,
} from '@/components/operation/OperationDialogs';
import { ReportIssueModal } from '@/components/operation/ReportIssueModal';
import { operationColumns, OperationTableMeta } from '@/components/tables/OperationColumn';
import { TablePagination } from '@/components/tables/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
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
  fk_mission_type_id?: number | null;
  fk_mission_category_id?: number | null;
  fk_luc_procedure_id?: number | null;
  luc_procedure_progress?: Record<string, Record<string, string>> | null;
  luc_completed_at?: string | null;
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
  if (!isSorted)
    return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/40" />;
  return isSorted === 'asc'
    ? <ArrowUp className="ml-1 inline h-3 w-3" />
    : <ArrowDown className="ml-1 inline h-3 w-3" />;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PLANNED: { label: 'Planned', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  ABORTED: { label: 'Aborted', className: 'bg-red-50 text-red-700 border-red-200' },
};

function formatDateTime(val?: string | null) {
  if (!val) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(val));
  } catch {
    return val;
  }
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function OperationsPage() {
  const { isDark } = useTheme();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Operation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Operation | null>(null);
  const [attachTarget, setAttachTarget] = useState<Operation | null>(null);
  const [detailTarget, setDetailTarget] = useState<Operation | null>(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState<boolean>(false);
  const [reportIssueOpen, setReportIssueOpen] = useState<boolean>(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [batchSettingPilot, setBatchSettingPilot] = useState(false);
  const [batchAutofilling, setBatchAutofilling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
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
  }, [filters, refreshKey]);

  const tableMeta = useMemo<OperationTableMeta>(
    () => ({
      onEdit: (op) => setEditTarget(op),
      onAttach: (op) => setAttachTarget(op),
      onDelete: (op) => setDeleteTarget(op),
      onViewDetails: (op) => setDetailTarget(op),
    }),
    []
  );

const table = useReactTable({
    data: operations,
    columns: operationColumns,
    state: { 
      sorting, 
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 8,  
      },
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.pilot_mission_id),
    meta: tableMeta,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  async function handleBatchDelete() {
    if (!selectedRows.length) return;
    setBatchDeleting(true);
    try {
      await Promise.all(
        selectedRows.map((op) => axios.delete(`/api/operation/${op.pilot_mission_id}`))
      );
      setOperations((prev) =>
        prev.filter((o) => !selectedRows.some((s) => s.pilot_mission_id === o.pilot_mission_id))
      );
      setRowSelection({});
      toast.success(`${selectedRows.length} operation(s) deleted`);
    } catch {
      toast.error('Failed to delete some operations');
    } finally {
      setBatchDeleting(false);
    }
  }

  async function handleBatchStatus(status: string) {
    if (!selectedRows.length) return;
    setBatchUpdating(true);
    try {
      await Promise.all(
        selectedRows.map((op) =>
          axios.put(`/api/operation/${op.pilot_mission_id}`, { status_name: status })
        )
      );
      setOperations((prev) =>
        prev.map((o) =>
          selectedRows.some((s) => s.pilot_mission_id === o.pilot_mission_id)
            ? { ...o, status_name: status }
            : o
        )
      );
      setRowSelection({});
      toast.success(`${selectedRows.length} operation(s) updated to ${status}`);
    } catch {
      toast.error('Failed to update some operations');
    } finally {
      setBatchUpdating(false);
    }
  }

  async function handleBatchSetPilot(pilotId: string) {
    if (!pilotId) return;
    const plannedRows = selectedRows.filter((r) => r.status_name === 'PLANNED');
    if (!plannedRows.length) {
      toast.warning('No Planned operations selected. Pilot can only be set on Planned missions.');
      return;
    }
    setBatchSettingPilot(true);
    try {
      const res = await axios.post('/api/operation/batch/set-pilot', {
        mission_ids: plannedRows.map((r) => r.pilot_mission_id),
        pilot_id: Number(pilotId),
      });
      const pilot = pilots.find((p) => p.user_id === Number(pilotId));
      const pilotName = pilot ? `${pilot.first_name} ${pilot.last_name}`.trim() : '';
      const updatedIds: number[] = res.data.updated_ids ?? [];
      setOperations((prev) =>
        prev.map((o) =>
          updatedIds.includes(o.pilot_mission_id)
            ? { ...o, fk_pilot_user_id: Number(pilotId), pilot_name: pilotName }
            : o
        )
      );
      setRowSelection({});
      const skipped = selectedRows.length - plannedRows.length;
      toast.success(
        `Pilot set for ${res.data.updated} operation(s)` +
          (skipped > 0 ? `. ${skipped} skipped (not Planned).` : '.')
      );
    } catch {
      toast.error('Failed to set pilot');
    } finally {
      setBatchSettingPilot(false);
    }
  }

  async function handleBatchAutofill() {
    const eligible = selectedRows.filter(
      (r) => r.status_name === 'COMPLETED' && r.fk_pilot_user_id
    );
    if (!eligible.length) {
      toast.warning(
        'No eligible operations. Autofill requires Completed missions with a pilot assigned.'
      );
      return;
    }
    setBatchAutofilling(true);
    try {
      const res = await axios.post('/api/operation/batch/autofill', {
        mission_ids: eligible.map((r) => r.pilot_mission_id),
      });
      setRowSelection({});
      const skipped = selectedRows.length - eligible.length;
      toast.success(
        `Autofilled ${res.data.processed} operation(s)` +
          (skipped > 0 ? `. ${skipped} skipped (not Completed or no pilot).` : '.')
      );
    } catch {
      toast.error('Failed to autofill tasks');
    } finally {
      setBatchAutofilling(false);
    }
  }

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

  const isCompleted = detailTarget?.status_name === 'COMPLETED';

  return (
    <TooltipProvider>
      <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#080c12] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`border-b ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="mx-auto">
            <div
              className={`top-0 z-10 backdrop-blur-md transition-colors ${
                isDark
                  ? 'bg-slate-900/80 border-b border-slate-800 text-white'
                  : 'bg-white/80 border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              } px-6 py-4 mb-8`}
            >
              <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                <div key={s.label} className={`rounded-lg border px-4 py-2.5 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-muted/30 border-slate-200'}`}>
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

        <div className={`border-b px-6 py-4 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
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

        {selectedRows.length > 0 && (
          <div className={cn(
            'mx-6 mt-4 flex items-center gap-2 rounded-lg border px-4 py-2.5',
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-violet-50 border-violet-200'
          )}>
            <span className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-violet-800')}>
              {selectedRows.length} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Select onValueChange={handleBatchSetPilot} disabled={batchSettingPilot}>
                <SelectTrigger className={cn('h-8 w-44 text-xs', isDark ? 'border-slate-600 bg-slate-700' : '')}>
                  <SelectValue placeholder={batchSettingPilot ? 'Setting pilot…' : 'Set pilot…'} />
                </SelectTrigger>
                <SelectContent>
                  {pilots.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id.toString()}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                disabled={batchAutofilling}
                onClick={handleBatchAutofill}
                className={cn(
                  'h-8 gap-1.5 text-xs',
                  isDark
                    ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                )}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {batchAutofilling ? 'Autofilling…' : 'Autofill Tasks'}
              </Button>

              <Select onValueChange={handleBatchStatus} disabled={batchUpdating}>
                <SelectTrigger className={cn('h-8 w-44 text-xs', isDark ? 'border-slate-600 bg-slate-700' : '')}>
                  <SelectValue placeholder={batchUpdating ? 'Updating…' : 'Change status…'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Set Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">Set In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Set Completed</SelectItem>
                  <SelectItem value="CANCELLED">Set Cancelled</SelectItem>
                  <SelectItem value="ABORTED">Set Aborted</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={batchDeleting}
                onClick={handleBatchDelete}
                className="h-8 gap-1.5 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {batchDeleting ? 'Deleting…' : 'Delete Selected'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRowSelection({})}
                className="h-8 w-8 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="mx-auto px-6 py-4">
          <div className={`rounded-lg border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className={isDark ? 'bg-slate-800/80 hover:bg-slate-800/80 border-slate-700' : 'bg-muted/40 hover:bg-muted/40'}
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
                      <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
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
                    <TableRow key={row.id} className={`group ${isDark ? 'border-slate-700/60 hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
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

      <Sheet open={!!detailTarget} onOpenChange={(open) => { if (!open) setDetailTarget(null); }}>
        <SheetContent className={`w-full sm:max-w-md overflow-y-auto p-6 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white'}`} side="right">
          {detailTarget && (
            <>
              <SheetHeader className="mb-6 pb-4 border-b">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {detailTarget.mission_code}
                  </span>
                  {detailTarget.status_name && STATUS_BADGE[detailTarget.status_name] && (
                    <Badge
                      variant="outline"
                      className={cn('text-xs', STATUS_BADGE[detailTarget.status_name].className)}
                    >
                      {STATUS_BADGE[detailTarget.status_name].label}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-left text-base mt-1">{detailTarget.mission_name}</SheetTitle>
                {detailTarget.mission_description && (
                  <p className="text-sm text-muted-foreground text-left">{detailTarget.mission_description}</p>
                )}
              </SheetHeader>

              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg border p-3 space-y-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30'}`}>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Scheduled</p>
                      <p className="text-sm font-medium">{formatDateTime(detailTarget.scheduled_start)}</p>
                    </div>
                    {detailTarget.actual_end && (
                      <div className={`rounded-lg border p-3 space-y-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30'}`}>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> End Time</p>
                        <p className="text-sm font-medium">{formatDateTime(detailTarget.actual_end)}</p>
                      </div>
                    )}
                  </div>
                </section>

                <div className="h-px bg-border" />

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personnel &amp; Equipment</h3>
                  <div className="space-y-2">
                    <DetailRow icon={<User className="h-3.5 w-3.5" />} label="Pilot in Command" value={detailTarget.pilot_name} />
                    <DetailRow icon={<Wrench className="h-3.5 w-3.5" />} label="Drone System" value={detailTarget.tool_code} />
                    <DetailRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Mission ID" value={`#${detailTarget.pilot_mission_id}`} />
                    {detailTarget.location && (
                      <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={detailTarget.location} />
                    )}
                  </div>
                </section>

                {isCompleted && (
                  <>
                    <div className="h-px bg-border" />
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flight Results</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Duration
                          </p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {detailTarget.flight_duration != null ? `${detailTarget.flight_duration} min` : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Navigation className="h-3 w-3" /> Distance
                          </p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {detailTarget.distance_flown != null
                              ? `${detailTarget.distance_flown.toLocaleString()} m`
                              : '—'}
                          </p>
                        </div>
                        {detailTarget.max_altitude != null && (
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Activity className="h-3 w-3" /> Max Altitude
                            </p>
                            <p className="text-sm font-bold tabular-nums">{detailTarget.max_altitude} m</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {detailTarget.notes && (
                  <>
                    <div className="h-px bg-border" />
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Pilot Notes
                      </h3>
                      <div className={`rounded-lg border p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30'}`}>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{detailTarget.notes}</p>
                      </div>
                    </section>
                  </>
                )}

                {detailTarget.fk_tool_id && (
                  <>
                    <div className="h-px bg-border" />
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" /> Maintenance
                      </h3>
                      {isCompleted && (
                        <>
                          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-3">
                            <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                Update maintenance cycles
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                Log flights &amp; hours for <span className="font-semibold">{detailTarget.tool_code}</span> after this mission.
                              </p>
                            </div>
                          </div>
                          <Button
                            className="w-full gap-2 bg-violet-600 hover:bg-violet-500 text-white"
                            onClick={() => setMaintenanceOpen(true)}
                          >
                            <Wrench className="h-4 w-4" />
                            Update Maintenance
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                        onClick={() => setReportIssueOpen(true)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Report Issue
                      </Button>
                    </section>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {detailTarget?.fk_tool_id && (
        <MaintenanceCycleModal
          open={maintenanceOpen}
          onClose={() => setMaintenanceOpen(false)}
          toolId={detailTarget.fk_tool_id}
          missionId={detailTarget.pilot_mission_id}
          isDark={isDark}
        />
      )}

      {detailTarget?.fk_tool_id && (
        <ReportIssueModal
          open={reportIssueOpen}
          onClose={() => setReportIssueOpen(false)}
          toolId={detailTarget.fk_tool_id}
          toolCode={detailTarget.tool_code ?? ''}
          missionId={detailTarget.pilot_mission_id}
          isDark={isDark}
        />
      )}

      <OperationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={handleSaved}
        onSuccess={() => setRefreshKey((k) => k + 1)}
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
