'use client';

import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AttachmentsDialog, DeleteDialog, formatDate, OperationDialog } from '@/components/operation/OperationDialogs';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
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

type SortField = 'mission_code' | 'mission_name' | 'status_name' | 'scheduled_start' | 'created_at';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PLANNED: { label: 'Planned', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="h-3 w-3" /> },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: <Loader2 className="h-3 w-3" /> },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <XCircle className="h-3 w-3" /> },
  ABORTED: { label: 'Aborted', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
};

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60 inline" />;
  return dir === 'asc'
    ? <ChevronUp className="ml-1 h-3.5 w-3.5 inline" />
    : <ChevronDown className="ml-1 h-3.5 w-3.5 inline" />;
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
interface FilterState {
  search: string;
  statusFilter: string;
  pilotFilter: string;
  dateStart: string;
  dateEnd: string;
}
export default function OperationsPage() {
  const { isDark } = useTheme();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Operation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Operation | null>(null);
  const [attachTarget, setAttachTarget] = useState<Operation | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statusFilter: 'ALL',
    pilotFilter: 'ALL',
    dateStart: '',
    dateEnd: '',
  });
  const [pilots, setPilots] = useState<{ user_id: number; first_name: string; last_name: string }[]>([]);
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


  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const displayed = [...operations].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const va = (a[sortField] ?? '') as string;
    const vb = (b[sortField] ?? '') as string;
    return va.localeCompare(vb) * dir;
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
        <div className="border-b bg-card px-6 py-5">
          <div className="mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Operations</h1>
                <p className="text-sm text-muted-foreground">Pilot missions &amp; flight operations</p>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
                size="sm"
                className={isDark ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Operation
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
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
                    <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
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
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="pl-8"
                />
              </div>

              <Select value={filters.statusFilter} onValueChange={(v) => setFilters((f) => ({ ...f, statusFilter: v }))}>
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

              <Select value={filters.pilotFilter} onValueChange={(v) => setFilters((f) => ({ ...f, pilotFilter: v }))}>
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
                onChange={(e) => setFilters((f) => ({ ...f, dateStart: e.target.value }))}
                className="w-36 text-sm"
                placeholder="From"
              />
              <Input
                type="date"
                value={filters.dateEnd}
                onChange={(e) => setFilters((f) => ({ ...f, dateEnd: e.target.value }))}
                className="w-36 text-sm"
                placeholder="To"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ search: '', statusFilter: 'ALL', pilotFilter: 'ALL', dateStart: '', dateEnd: '' })}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>

              <span className="ml-auto text-sm text-muted-foreground">
                {loading ? <Skeleton className="h-4 w-24" /> : `${operations.length} operations`}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto px-6 py-4">
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('mission_code')}>
                    Code <SortIcon field="mission_code" active={sortField === 'mission_code'} dir={sortDir} />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('mission_name')}>
                    Mission <SortIcon field="mission_name" active={sortField === 'mission_name'} dir={sortDir} />
                  </TableHead>
                  <TableHead>Pilot</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status_name')}>
                    Status <SortIcon field="status_name" active={sortField === 'status_name'} dir={sortDir} />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('scheduled_start')}>
                    Scheduled <SortIcon field="scheduled_start" active={sortField === 'scheduled_start'} dir={sortDir} />
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-[110px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
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
                ) : displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                      <Wrench className="mx-auto mb-2 h-8 w-8 opacity-25" />
                      <p className="text-sm">No operations found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((op) => (
                    <TableRow key={op.pilot_mission_id} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">{op.mission_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{op.mission_name}</p>
                          {op.mission_description && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{op.mission_description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{op.pilot_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{op.tool_code || '—'}</TableCell>
                      <TableCell><StatusBadge status={op.status_name} /></TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(op.scheduled_start ?? undefined)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{op.location || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTarget(op)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAttachTarget(op)}>
                                <Paperclip className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Attachments</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(op)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <OperationDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={handleSaved} />
      <OperationDialog open={!!editTarget} initial={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />
      <DeleteDialog open={!!deleteTarget} operation={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />
      {attachTarget && (
        <AttachmentsDialog
          open={!!attachTarget}
          operationId={attachTarget.pilot_mission_id}
          operationName={attachTarget.mission_name}
          onClose={() => setAttachTarget(null)}
        />
      )}
    </TooltipProvider>
  );
}