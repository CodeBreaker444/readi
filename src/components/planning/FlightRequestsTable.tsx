'use client';

import { FlightRequestDetailModal } from '@/components/planning/FlightRequestDetailModal';
import { FlightRequest, createFlightRequestColumns } from '@/components/tables/flightRequestsColumns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toastAfterDccAction } from '@/lib/dcc-toast';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { AlertCircle, Archive, CheckCircle2, Clock, FileUp, Loader2, MapPin, RotateCcw, Send, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [requests, setRequests]             = useState<FlightRequest[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filterStatus, setFilterStatus]     = useState('ALL');
  const [assigning, setAssigning]           = useState<number | null>(null);
  const [denying, setDenying]               = useState<number | null>(null);
  const [deleting, setDeleting]             = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm]   = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<{ id: number; status: string } | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<FlightRequest | null>(null);

  // ── Log modal state ────────────────────────────────────────────────────────
  const [logModal, setLogModal] = useState<{ request_id: number; mission_id: string } | null>(null);

  // log-status check
  const [logStatus, setLogStatus] = useState<
    { has_log: boolean; logs: Array<{ log_id: number; original_filename: string; flytbase_flight_id: string | null; uploaded_at: string }>; reason?: string } | null
  >(null);
  const [logStatusLoading, setLogStatusLoading] = useState(false);

  // FlytBase flight picker
  const [availableFlights, setAvailableFlights] = useState<Array<{ flight_id: string; flight_name?: string; start_time?: number; drone_name?: string }>>([]);
  const [flightsLoading, setFlightsLoading] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState('');

  // archive + push
  const [archiving, setArchiving] = useState(false);
  const [pushingLog, setPushingLog] = useState(false);

  const [planModal, setPlanModal]           = useState<{ request_id: number; mission_id: string } | null>(null);
  const [plannings, setPlannings]           = useState<Planning[]>([]);
  const [evalLoading, setEvalLoading]       = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/planning/flight-requests', { status: filterStatus });
      setRequests(data.items);
    } catch {
      toast.error('Failed to load flight requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleDeny(request_id: number) {
    setDenying(request_id);
    try {
      const { data } = await axios.post<{ code: number; dcc?: DccCallbackResult }>(
        '/api/planning/flight-requests/deny',
        { request_id },
      );
      toastAfterDccAction('Request denied', data.dcc);
      setSelectedRequest(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to deny request');
    } finally {
      setDenying(null);
    }
  }

  async function handleAcknowledge(request_id: number) {
    setAssigning(request_id);
    try {
      await axios.post('/api/planning/flight-requests/assign', { request_id });
      toast.success('Request acknowledged');
      setSelectedRequest(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to acknowledge');
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
      toast.success('Flight request deleted');
      setRequests((prev) => prev.filter((r) => r.request_id !== request_id));
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to delete');
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
      toast.error(err?.response?.data?.error ?? 'Failed to update status');
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
    } catch (err: any){
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
      toast.success('Log archived to S3');
      const { data } = await axios.get(`/api/planning/flight-requests/${logModal.request_id}/log-status`);
      setLogStatus({ has_log: data.has_log, logs: data.logs ?? [] });
      setSelectedFlightId('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to archive log');
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
      toastAfterDccAction('Flight log pushed to DCC', data.dcc);
      setLogModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to push log');
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
      toast.error('Failed to load planning missions');
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
      toastAfterDccAction('Flight request linked to planning mission', data.dcc);
      setPlanModal(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to move to planning');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo(() => createFlightRequestColumns({
    deleting,
    updatingStatus,
    isDark,
    onView: setSelectedRequest,
    onDelete: (id) => setDeleteConfirm(id),
    onUpdateStatus: handleUpdateStatus,
  }), [deleting, updatingStatus, isDark]);

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const card  = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const thCls = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const tdCls = `px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  return (
    <div className={`flex flex-col min-h-screen w-full ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>

      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Flight Requests</h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Incoming mission requests from external services</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className={`h-8 text-xs w-36 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                {['ALL', 'NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ISSUE', 'REJECTED'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}
              className={`h-8 gap-1.5 text-xs ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : ''}`}>
              <RotateCcw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total',        value: requests.length,                                                 icon: Send,          color: 'text-violet-500' },
            { label: 'New',          value: requests.filter((r) => r.dcc_status === 'NEW').length,           icon: AlertCircle,   color: 'text-blue-500'   },
            { label: 'Acknowledged', value: requests.filter((r) => r.dcc_status === 'ACKNOWLEDGED').length,  icon: Clock,         color: 'text-yellow-500' },
            { label: 'Assigned',     value: requests.filter((r) => r.dcc_status === 'ASSIGNED').length,      icon: CheckCircle2,  color: 'text-violet-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${card}`}>
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
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
                      No flight requests found.
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

      {/* Detail modal */}
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

      {/* Delete confirm dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent className={isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flight request?</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-slate-400' : ''}>
              This will permanently remove the request from Readi. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent cursor-pointer' : 'cursor-pointer'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 cursor-pointer hover:bg-red-500 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {logModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl p-6 space-y-5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>

            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Push Log to DCC</h2>
                <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{logModal.mission_id}</p>
              </div>
              <button onClick={() => setLogModal(null)} className={`p-1 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`rounded-xl border p-4 space-y-1 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Step 1 — Log in S3</p>
              {logStatusLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                </div>
              ) : !logStatus ? null
              : logStatus.reason === 'not_assigned' ? (
                <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  This request is not yet assigned to a planning mission. Assign it first.
                </p>
              ) : logStatus.reason === 'no_mission' ? (
                <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  The assigned planning has no mission configured. Open the planning and assign a system to it first.
                </p>
              ) : logStatus.logs.length > 0 ? (
                <div className="space-y-1.5">
                  {logStatus.logs.map((l) => {
                    const isFlytbase = !!l.flytbase_flight_id;
                    return (
                      <div key={l.log_id} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                        isFlytbase
                          ? isDark ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
                          : isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-100 border-gray-200'
                      }`}>
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isFlytbase ? isDark ? 'text-emerald-400' : 'text-emerald-600' : isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                        <span className={`text-xs font-mono flex-1 truncate ${isFlytbase ? isDark ? 'text-emerald-300' : 'text-emerald-700' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {l.original_filename}
                        </span>
                        <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full ${
                          isFlytbase
                            ? isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                            : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isFlytbase ? 'FlytBase' : 'manual'}
                        </span>
                      </div>
                    );
                  })}
                  {!logStatus.has_log && (
                    <p className={`text-xs pt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      Manual logs cannot be pushed to DCC. Archive a FlytBase flight below.
                    </p>
                  )}
                </div>
              ) : (
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No log archived yet. Select a flight below to archive it.</p>
              )}
            </div>

            {logStatus && !logStatus.has_log && !['not_assigned', 'no_mission'].includes(logStatus.reason ?? '') && (
              <div className="space-y-2">
                <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Select a FlytBase Flight to Archive</p>
                {flightsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading flights…
                  </div>
                ) : availableFlights.length === 0 ? (
                  <p className={`text-xs py-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No recent FlytBase flights found. Check your FlytBase integration.</p>
                ) : (
                  <div className={`rounded-xl border overflow-hidden divide-y max-h-48 overflow-y-auto ${isDark ? 'border-slate-700 divide-slate-700/60' : 'border-gray-200 divide-gray-100'}`}>
                    {availableFlights.map((f) => {
                      const isSelected = selectedFlightId === f.flight_id;
                      return (
                        <button
                          key={f.flight_id}
                          onClick={() => setSelectedFlightId(f.flight_id)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-xs transition-colors ${
                            isSelected
                              ? isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-50 text-violet-700'
                              : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-violet-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                          <span className="flex-1 min-w-0">
                            <span className="font-mono font-medium">{f.flight_name ?? f.flight_id}</span>
                            {f.drone_name && <span className={`ml-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{f.drone_name}</span>}
                          </span>
                          {f.start_time && (
                            <span className={`shrink-0 text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              {new Date(f.start_time).toLocaleDateString()}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={handleArchiveLog}
                  disabled={!selectedFlightId || archiving}
                  className="w-full h-8 text-xs bg-slate-700 hover:bg-slate-600 text-white"
                >
                  {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Archive className="h-3.5 w-3.5 mr-1.5" />}
                  {archiving ? 'Archiving…' : 'Archive Selected Flight to S3'}
                </Button>
              </div>
            )}

            {/* Step 2 — Push to DCC */}
            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-[10px] uppercase tracking-wider font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Step 2 — Push to DCC</p>
              {!logStatus?.has_log ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Archive a log first to enable this step.</p>
              ) : (
                <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  The archived log will be sent to Movyon DCC as the mission flight report.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handlePushLog}
                  disabled={!logStatus?.has_log || pushingLog}
                  className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
                >
                  {pushingLog ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <FileUp className="h-3.5 w-3.5 mr-1.5" />}
                  {pushingLog ? 'Pushing…' : 'Push to DCC'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setLogModal(null)}
                  className={`h-8 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>
                  Cancel
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Move to Planning modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl p-6 space-y-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Move to Planning</h2>
                <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{planModal.mission_id}</p>
              </div>
              <button onClick={() => setPlanModal(null)} className={`p-1 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Select a planning mission</p>
              {evalLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
              ) : plannings.length === 0 ? (
                <p className={`text-xs py-3 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No planning missions found.</p>
              ) : (
                <div className={`rounded-lg border overflow-hidden divide-y max-h-56 overflow-y-auto ${isDark ? 'border-slate-700 divide-slate-700' : 'border-gray-200 divide-gray-100'}`}>
                  {plannings.map((pl) => {
                    const isSelected = selectedEvalId === String(pl.planning_id);
                    const disabled = !pl.has_valid_drone;
                    return (
                      <button
                        key={pl.planning_id}
                        disabled={disabled}
                        onClick={() => !disabled && setSelectedEvalId(String(pl.planning_id))}
                        title={disabled ? 'No drone with DCC ID assigned to this planning' : undefined}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-xs
                          ${disabled
                            ? isDark ? 'opacity-40 cursor-not-allowed text-slate-500' : 'opacity-40 cursor-not-allowed text-gray-400'
                            : isSelected
                              ? isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-50 text-violet-700'
                              : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-violet-500' : disabled ? isDark ? 'bg-slate-700' : 'bg-gray-200' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                        <span className="flex-1 min-w-0">
                          <span className="font-mono font-semibold mr-2">PLN-{pl.planning_id}</span>
                          <span className="font-medium">{pl.client_name}</span>
                          {pl.planning_desc && <span className={`ml-1 truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>— {pl.planning_desc}</span>}
                        </span>
                        {disabled
                          ? <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-600' : 'bg-gray-100 text-gray-400'}`}>No Drone with DCC ID</span>
                          : <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>{pl.planning_status}</span>
                        }
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleMoveToPlan} disabled={!selectedEvalId || submitting}
                className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPlanModal(null)}
                className={`h-8 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
