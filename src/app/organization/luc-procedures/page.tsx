'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import axios from 'axios';
import { ChevronDown, ChevronsUpDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getLucProcedureColumns } from '@/components/organization/LcuProcedureColumn';
import { LcuDeleteDialog, LcuEditModal } from '@/components/organization/LcuProcedureSections';
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
import { useTheme } from '@/components/useTheme';
import type {
  CreateLucProcedurePayload,
  LucProcedure,
  LucProcedureStatus,
} from '@/config/types/lcuProcedures';

const STATUS_FILTER_OPTIONS: { value: LucProcedureStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',        label: 'All Statuses' },
  { value: 'EVALUATION', label: 'Evaluation'   },
  { value: 'PLANNING',   label: 'Planning'     },
  { value: 'MISSION',    label: 'Mission'      },
];

const ACTIVE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All'      },
  { value: 'Y',   label: 'Active'   },
  { value: 'N',   label: 'Inactive' },
];

function StatCard({
  label, value, colorClass, bgClass, darkBgClass, darkColorClass, isDark,
}: {
  label: string; value: number;
  colorClass: string; bgClass: string;
  darkBgClass: string; darkColorClass: string;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-xl px-4 py-3 border shadow-sm
      ${isDark
        ? `${darkBgClass} border-slate-700/60`
        : `${bgClass} border-slate-100`
      }`}>
      <div className={`text-xl font-bold ${isDark ? darkColorClass : colorClass}`}>{value}</div>
      <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{label}</div>
    </div>
  );
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (direction === 'asc')  return <ChevronUp    className="h-3 w-3 ml-1 shrink-0" />;
  if (direction === 'desc') return <ChevronDown  className="h-3 w-3 ml-1 shrink-0" />;
  return                           <ChevronsUpDown className="h-3 w-3 ml-1 shrink-0 opacity-40" />;
}

export default function LucProceduresPage() {
  const { isDark } = useTheme();
  const [procedures,   setProcedures]   = useState<LucProcedure[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<LucProcedure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LucProcedure | null>(null);
  const [globalFilter,   setGlobalFilter]   = useState('');
  const [columnFilters,  setColumnFilters]  = useState<ColumnFiltersState>([]);
  const [sorting,        setSorting]        = useState<SortingState>([]);

  const loadProcedures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/organization/luc-procedures');
      setProcedures(res.data.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load procedures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProcedures(); }, [loadProcedures]);

  const handleCreate = async (data: Partial<CreateLucProcedurePayload>) => {
    try {
      setSaving(true);
      await axios.post('/api/organization/luc-procedures', data);
      toast.success('Procedure created successfully');
      setShowCreate(false);
      loadProcedures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (data: Partial<CreateLucProcedurePayload>) => {
    if (!editTarget) return;
    try {
      setSaving(true);
      await axios.put(`/api/organization/luc-procedures/${editTarget.procedure_id}`, data);
      toast.success('Procedure updated successfully');
      setEditTarget(null);
      loadProcedures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`/api/organization/luc-procedures/${deleteTarget.procedure_id}`);
      toast.success('Procedure deleted');
      setDeleteTarget(null);
      loadProcedures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = useMemo(() => getLucProcedureColumns(setEditTarget, setDeleteTarget), []);

  const table = useReactTable({
    data: procedures,
    columns,
    state: { globalFilter, columnFilters, sorting },
    onGlobalFilterChange:  setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange:       setSorting,
    getCoreRowModel:       getCoreRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    globalFilterFn: (row, _colId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.procedure_code.toLowerCase().includes(q) ||
        row.original.procedure_name.toLowerCase().includes(q) ||
        (row.original.procedure_description ?? '').toLowerCase().includes(q)
      );
    },
  });

  const getColFilter = (colId: string) =>
    (columnFilters.find(f => f.id === colId)?.value as string) ?? 'ALL';

  const setColFilter = (colId: string, value: string) => {
    setColumnFilters(prev => {
      const rest = prev.filter(f => f.id !== colId);
      return value === 'ALL' ? rest : [...rest, { id: colId, value }];
    });
  };

  const stats = useMemo(() => ({
    total:      procedures.length,
    active:     procedures.filter(p => p.procedure_active === 'Y').length,
    evaluation: procedures.filter(p => p.procedure_status === 'EVALUATION').length,
    planning:   procedures.filter(p => p.procedure_status === 'PLANNING').length,
    mission:    procedures.filter(p => p.procedure_status === 'MISSION').length,
  }), [procedures]);

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400';

  const selectTriggerCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200'
    : 'bg-gray-50 border-gray-200 text-gray-700';

  const selectContentCls = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-200'
    : '';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>

      <div className={`top-0 z-10 backdrop-blur-md transition-colors w-full px-6 py-4 mb-8
        ${isDark
          ? 'bg-slate-900/80 border-b border-slate-700/60 text-white'
          : 'bg-white/80 border-b border-gray-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
        }`}>
        <div className="max-w-[1800px] flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                LUC Procedures
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Manage light UAS operator certificate procedures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProcedures}
              disabled={loading}
              className={`h-8 gap-1.5 text-xs transition-all
                ${isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'
                }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-none shadow-sm shadow-violet-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Procedure
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total"      value={stats.total}      isDark={isDark}
            colorClass="text-slate-700"   bgClass="bg-white"
            darkColorClass="text-slate-200" darkBgClass="bg-slate-800/80" />
          <StatCard label="Active"     value={stats.active}     isDark={isDark}
            colorClass="text-emerald-700" bgClass="bg-emerald-50"
            darkColorClass="text-emerald-400" darkBgClass="bg-emerald-500/10" />
          <StatCard label="Evaluation" value={stats.evaluation} isDark={isDark}
            colorClass="text-violet-700"  bgClass="bg-violet-50"
            darkColorClass="text-violet-400" darkBgClass="bg-violet-500/10" />
          <StatCard label="Planning"   value={stats.planning}   isDark={isDark}
            colorClass="text-sky-700"     bgClass="bg-sky-50"
            darkColorClass="text-sky-400" darkBgClass="bg-sky-500/10" />
          <StatCard label="Mission"    value={stats.mission}    isDark={isDark}
            colorClass="text-amber-700"   bgClass="bg-amber-50"
            darkColorClass="text-amber-400" darkBgClass="bg-amber-500/10" />
        </div>

        <div className={`rounded-xl border px-4 py-3 mb-5 flex flex-col sm:flex-row gap-3
          ${isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="relative flex-1">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none
              ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search by code, name or description…"
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className={`pl-9 h-9 text-sm ${inputCls}`}
            />
          </div>

          <Select value={getColFilter('procedure_status')} onValueChange={val => setColFilter('procedure_status', val)}>
            <SelectTrigger className={`w-full sm:w-44 h-9 text-sm ${selectTriggerCls}`}>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className={selectContentCls}>
              {STATUS_FILTER_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={getColFilter('procedure_active')} onValueChange={val => setColFilter('procedure_active', val)}>
            <SelectTrigger className={`w-full sm:w-36 h-9 text-sm ${selectTriggerCls}`}>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className={selectContentCls}>
              {ACTIVE_FILTER_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={`rounded-xl border shadow-sm overflow-hidden mb-4
          ${isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200'}`}>
          <Table>
            <TableHeader className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}
                  className={isDark ? 'border-slate-700/60 hover:bg-transparent' : 'border-gray-100 hover:bg-slate-50'}>
                  {hg.headers.map(header => {
                    const canSort = header.column.getCanSort();
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.column.getSize() }}
                        className={`text-xs font-semibold uppercase tracking-wider h-10
                          ${isDark ? 'text-slate-500' : 'text-slate-500'}`}
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            disabled={!canSort}
                            onClick={header.column.getToggleSortingHandler()}
                            className={`flex items-center
                              ${canSort
                                ? isDark
                                  ? 'cursor-pointer hover:text-slate-200'
                                  : 'cursor-pointer hover:text-slate-700'
                                : 'cursor-default'
                              }`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && <SortIcon direction={header.column.getIsSorted()} />}
                          </button>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className={isDark ? 'border-slate-700/40' : 'border-gray-50'}>
                    {columns.map((_, j) => (
                      <TableCell key={j} className="py-3.5">
                        <Skeleton className={`h-4 w-full rounded ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <svg className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        No procedures found
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        {globalFilter || columnFilters.length > 0
                          ? 'Try adjusting your filters'
                          : 'Add your first LUC procedure to get started'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    className={`transition-colors
                      ${isDark
                        ? 'border-slate-700/40 hover:bg-slate-700/30'
                        : 'border-gray-50 hover:bg-slate-50/70'
                      }`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}
                        className={`py-3.5 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
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

      <LcuEditModal
        open={showCreate}
        procedure={null}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        saving={saving}
      />
      <LcuEditModal
        open={!!editTarget}
        procedure={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        saving={saving}
      />
      <LcuDeleteDialog
        open={!!deleteTarget}
        procedure={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}