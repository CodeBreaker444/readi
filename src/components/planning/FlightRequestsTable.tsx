'use client';

import { FlightRequestDetailModal } from '@/components/planning/FlightRequestDetailModal';
import { FlightRequestsHeader } from '@/components/planning/flight-requests/FlightRequestsHeader';
import { FlightRequestsLogModal } from '@/components/planning/flight-requests/FlightRequestsLogModal';
import { FlightRequestsPlanModal } from '@/components/planning/flight-requests/FlightRequestsPlanModal';
import { FlightRequestsStats } from '@/components/planning/flight-requests/FlightRequestsStats';
import { FlightRequest, createFlightRequestColumns } from '@/components/tables/flightRequestsColumns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toastAfterDccAction } from '@/lib/dcc-toast';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { MapPin } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { TablePagination } from '../tables/Pagination';
import { useTheme } from '../useTheme';

interface Planning {
  planning_id: number;
  planning_code: string;
  planning_desc: string;
  client_name: string;
  planning_status: string;
  has_valid_drone: boolean;
}

export default function FlightRequestsTable() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [assigning, setAssigning] = useState<number | null>(null);
  const [denying, setDenying] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<{ id: number; status: string } | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<FlightRequest | null>(null);

  const [logModal, setLogModal] = useState<{ request_id: number; mission_id: string } | null>(null);

  const [logStatus, setLogStatus] = useState<
    { has_log: boolean; logs: Array<{ log_id: number; original_filename: string; flytbase_flight_id: string | null; uploaded_at: string }>; reason?: string } | null
  >(null);
  const [logStatusLoading, setLogStatusLoading] = useState(false);

  const [availableFlights, setAvailableFlights] = useState<Array<{ flight_id: string; flight_name?: string; start_time?: number; drone_name?: string }>>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState('');

  const [archiving, setArchiving] = useState(false);
  const [pushingLog, setPushingLog] = useState(false);

  const [planModal, setPlanModal] = useState<{ request_id: number; mission_id: string } | null>(null);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const statusOptions = ['ALL', 'NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ISSUE', 'REJECTED'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/planning/flight-requests', { status: filterStatus });
      setRequests(data.items);
    } catch {
      toast.error(t('planning.flightRequests.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, t]);

  useEffect(() => { load(); }, [load]);

  async function handleDeny(request_id: number) {
    setDenying(request_id);
    try {
      const { data } = await axios.post<{ code: number; dcc?: DccCallbackResult }>(
        '/api/planning/flight-requests/deny',
        { request_id },
      );
      toastAfterDccAction(t('planning.flightRequests.denied'), data.dcc);
      setSelectedRequest(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('planning.flightRequests.linkError'));
    } finally {
      setDenying(null);
    }
  }

  async function handleAcknowledge(request_id: number) {
    setAssigning(request_id);
    try {
      await axios.post('/api/planning/flight-requests/assign', { request_id });
      toast.success(t('planning.flightRequests.acknowledged2'));
      setSelectedRequest(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('planning.flightRequests.acknowledgeError'));
    } finally {
      setAssigning(null);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    const request_id = deleteConfirm;
    setDeleteConfirm(null);
    setDeleting(request_id);
    try {
      await axios.delete(`/api/planning/flight-requests/${request_id}`);
      toast.success(t('planning.flightRequests.deleteSuccess'));
      setRequests((prev) => prev.filter((r) => r.request_id !== request_id));
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('planning.flightRequests.deleteError'));
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpdateStatus(request_id: number, status: string) {
    setUpdatingStatus({ id: request_id, status });
    try {
      await axios.patch(`/api/planning/flight-requests/${request_id}`, { dcc_status: status });
      toast.success(`Status updated to ${status}`);
      setRequests((prev) =>
        prev.map((r) => r.request_id === request_id ? { ...r, dcc_status: status } : r),
      );
      if (selectedRequest?.request_id === request_id) {
        setSelectedRequest((prev) => prev ? { ...prev, dcc_status: status } : prev);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('common.error'));
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function openLogModal(request_id: number, mission_id: string) {
    setLogModal({ request_id, mission_id });
    setLogStatus(null);
    setSelectedFlightId('');
    setAvailableFlights([]);

    // Check if a log is already linked
    setLogStatusLoading(true);
    try {
      const { data } = await axios.get(`/api/planning/flight-requests/${request_id}/log-status`);
      setLogStatus({ has_log: data.has_log, logs: data.logs ?? [], reason: data.reason });
    } catch {
      setLogStatus({ has_log: false, logs: [] });
    } finally {
      setLogStatusLoading(false);
    }

    // Load FlytBase flights in parallel for the picker
    setFlightsLoading(true);
    try {
      const { data } = await axios.get('/api/flytbase/flights?mode=latest');
      setAvailableFlights(data.flights ?? []);
    } catch (err: any) {
      toast.error(err)
    } finally {
      setFlightsLoading(false);
    }
  }

  async function handleArchiveLog() {
    if (!logModal || !selectedFlightId) return;
    setArchiving(true);
    try {
      await axios.post('/api/planning/flight-requests/logs', {
        action: 'link',
        request_id: logModal.request_id,
        flight_id: selectedFlightId,
      });
      toast.success(t('planning.flightRequests.archiveSuccess'));
      const { data } = await axios.get(`/api/planning/flight-requests/${logModal.request_id}/log-status`);
      setLogStatus({ has_log: data.has_log, logs: data.logs ?? [] });
      setSelectedFlightId('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('planning.flightRequests.archiveError'));
    } finally {
      setArchiving(false);
    }
  }

  async function handlePushLog() {
    if (!logModal) return;
    setPushingLog(true);
    try {
      const { data } = await axios.post<{ code: number; dcc?: DccCallbackResult }>(
        '/api/planning/flight-requests/logs',
        { action: 'push', request_id: logModal.request_id },
      );
      toastAfterDccAction(t('planning.flightRequests.pushSuccess'), data.dcc);
      setLogModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('planning.flightRequests.pushError'));
    } finally {
      setPushingLog(false);
    }
  }

  async function openPlanModal(request_id: number, mission_id: string) {
    setPlanModal({ request_id, mission_id });
    setSelectedEvalId('');
    setEvalLoading(true);
    try {
      const { data } = await axios.get('/api/planning/flight-requests/assignable-plannings');
      setPlannings(data.items ?? []);
    } catch {
      toast.error(t('planning.flightRequests.loadPlanningsError'));
    } finally {
      setEvalLoading(false);
    }
  }

  async function handleMoveToPlan() {
    if (!planModal || !selectedEvalId) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post<{ code: number; dcc?: DccCallbackResult }>(
        '/api/planning/flight-requests/assign',
        {
          request_id: planModal.request_id,
          planning_id: Number(selectedEvalId),
        },
      );
      toastAfterDccAction(t('planning.flightRequests.linkSuccess'), data.dcc);
      setPlanModal(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('planning.flightRequests.linkError'));
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo(() => createFlightRequestColumns({
    deleting,
    updatingStatus,
    isDark,
    t,
    onView: setSelectedRequest,
    onDelete: (id) => setDeleteConfirm(id),
    onUpdateStatus: handleUpdateStatus,
  }), [deleting, updatingStatus, isDark, t]);

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const card = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const thCls = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const tdCls = `px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  return (
    <div className={`flex flex-col min-h-screen w-full ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>

      <FlightRequestsHeader
        isDark={isDark}
        filterStatus={filterStatus}
        statuses={statusOptions}
        onFilterChange={setFilterStatus}
        onRefresh={load}
      />

      <FlightRequestsStats isDark={isDark} requests={requests} />

      <div className="max-w-[1600px] mx-auto w-full px-6 pb-8">
        <div className={`rounded-xl border shadow-sm ${card}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className={isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} className={thCls}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-gray-50'}`}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: columns.length }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className={`py-14 text-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      {t('planning.flightRequests.noRequests')}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/80'}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className={tdCls}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <TablePagination table={table} />
      </div>

      <FlightRequestDetailModal
        request={selectedRequest}
        isDark={isDark}
        assigning={assigning}
        denying={denying}
        onClose={() => setSelectedRequest(null)}
        onAcknowledge={handleAcknowledge}
        onDeny={handleDeny}
        onOpenPlanModal={openPlanModal}
        onOpenLogModal={openLogModal}
      />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent className={isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planning.flightRequests.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-slate-400' : ''}>
              {t('planning.flightRequests.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent cursor-pointer' : 'cursor-pointer'}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 cursor-pointer hover:bg-red-500 text-white">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FlightRequestsLogModal
        isDark={isDark}
        logModal={logModal}
        logStatus={logStatus}
        logStatusLoading={logStatusLoading}
        flightsLoading={flightsLoading}
        availableFlights={availableFlights}
        selectedFlightId={selectedFlightId}
        archiving={archiving}
        pushingLog={pushingLog}
        onSelectFlight={setSelectedFlightId}
        onArchive={handleArchiveLog}
        onPush={handlePushLog}
        onClose={() => setLogModal(null)}
      />

      <FlightRequestsPlanModal
        isDark={isDark}
        planModal={planModal}
        plannings={plannings}
        evalLoading={evalLoading}
        selectedEvalId={selectedEvalId}
        submitting={submitting}
        onSelectPlanning={setSelectedEvalId}
        onConfirm={handleMoveToPlan}
        onClose={() => setPlanModal(null)}
      />
    </div>
  );
}
