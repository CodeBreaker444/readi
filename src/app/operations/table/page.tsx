'use client';

import GeneralCommunicationDialog from '@/components/operation/GeneralCommunicationDialog';
import ImportOperationDialog from '@/components/operation/ImportOperationDialog';
import { NewOperationModal } from '@/components/operation/NewOperationModal';
import {
  AttachmentsDialog,
  DeleteDialog,
  OperationDialog,
} from '@/components/operation/OperationDialogs';
import { OperationDetailSheet } from '@/components/operation/table/OperationDetailSheet';
import { OperationsBatchBar } from '@/components/operation/table/OperationsBatchBar';
import { OperationsFilters } from '@/components/operation/table/OperationsFilters';
import { OperationsPageHeader } from '@/components/operation/table/OperationsPageHeader';
import { OperationsStats } from '@/components/operation/table/OperationsStats';
import { OperationsTable } from '@/components/operation/table/OperationsTable';
import { getOperationColumns, OperationTableMeta } from '@/components/tables/OperationColumn';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from '@/components/useTheme';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const DEFAULT_FILTERS: FilterState = {
  search: '',
  statusFilter: 'ALL',
  pilotFilter: 'ALL',
  dateStart: '',
  dateEnd: '',
};

export default function OperationsPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Operation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Operation | null>(null);
  const [attachTarget, setAttachTarget] = useState<Operation | null>(null);
  const [detailTarget, setDetailTarget] = useState<Operation | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [batchSettingPilot, setBatchSettingPilot] = useState(false);
  const [batchAutofilling, setBatchAutofilling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'scheduled_start', desc: true }]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
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
        toast.error(e instanceof Error ? e.message : t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchOperations();
  }, [filters, refreshKey]);

const columns = useMemo(() => getOperationColumns(t), [t]);

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
  columns: columns, 
  state: { sorting, rowSelection },
  initialState: { pagination: { pageSize: 8 } },
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
      toast.success(t('operations.table.toast.deleteSuccess', { count: selectedRows.length }));
    } catch {
      toast.error(t('operations.table.toast.deleteError'));
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
      toast.success(
        t('operations.table.toast.statusSuccess', { count: selectedRows.length, status })
      );
    } catch {
      toast.error(t('operations.table.toast.statusError'));
    } finally {
      setBatchUpdating(false);
    }
  }

  async function handleBatchSetPilot(pilotId: string) {
    if (!pilotId) return;
    const plannedRows = selectedRows.filter((r) => r.status_name === 'PLANNED');
    if (!plannedRows.length) {
      toast.warning(t('operations.table.toast.pilotWarning'));
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
        t('operations.table.toast.pilotSuccess', { count: res.data.updated }) +
          (skipped > 0 ? ` ${t('operations.table.toast.pilotSkipped', { count: skipped })}` : '')
      );
    } catch {
      toast.error(t('operations.table.toast.pilotError'));
    } finally {
      setBatchSettingPilot(false);
    }
  }

  async function handleBatchAutofill() {
    const eligible = selectedRows.filter(
      (r) => r.status_name === 'COMPLETED' && r.fk_pilot_user_id
    );
    if (!eligible.length) {
      toast.warning(t('operations.table.toast.autofillWarning'));
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
        t('operations.table.toast.autofillSuccess', { count: res.data.processed }) +
          (skipped > 0
            ? ` ${t('operations.table.toast.autofillSkipped', { count: skipped })}`
            : '')
      );
    } catch {
      toast.error(t('operations.table.toast.autofillError'));
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

  return (
    <TooltipProvider>
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDark ? 'bg-[#080c12] text-white' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <div
          className={`border-b ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="mx-auto">
            <OperationsPageHeader
              isDark={isDark}
              onCommunication={() => setCommOpen(true)}
              onImport={() => setImportOpen(true)}
              onCreate={() => setCreateOpen(true)}
            />
            <OperationsStats
              isDark={isDark}
              loading={loading}
              total={stats.total}
              planned={stats.planned}
              inProgress={stats.inProgress}
              completed={stats.completed}
            />
          </div>
        </div>

        <OperationsFilters
          isDark={isDark}
          loading={loading}
          filters={filters}
          pilots={pilots}
          operationsCount={operations.length}
          onFilterChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        {selectedRows.length > 0 && (
          <OperationsBatchBar
            isDark={isDark}
            selectedCount={selectedRows.length}
            pilots={pilots}
            batchDeleting={batchDeleting}
            batchUpdating={batchUpdating}
            batchSettingPilot={batchSettingPilot}
            batchAutofilling={batchAutofilling}
            onBatchDelete={handleBatchDelete}
            onBatchStatus={handleBatchStatus}
            onBatchSetPilot={handleBatchSetPilot}
            onBatchAutofill={handleBatchAutofill}
            onClearSelection={() => setRowSelection({})}
          />
        )}

        <OperationsTable isDark={isDark} loading={loading} table={table} />
      </div>

      <OperationDetailSheet
        isDark={isDark}
        operation={detailTarget}
        onClose={() => setDetailTarget(null)}
        onEdit={(op) => { setDetailTarget(null); setEditTarget(op); }}
      />

      <NewOperationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { setRefreshKey((k) => k + 1); setCreateOpen(false); }}
        isDark={isDark}
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
