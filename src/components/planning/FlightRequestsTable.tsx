'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, RotateCcw, Send, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';

interface Evaluation {
  evaluation_id: number;
  evaluation_year: string | number | null;
  client_name: string;
  evaluation_desc: string;
  evaluation_status: string;
}

interface FlightRequest {
  request_id: number;
  external_mission_id: string;
  mission_type: string | null;
  target: string | null;
  localization: any;
  waypoint: any;
  start_datetime: string | null;
  priority: string | null;
  notes: string | null;
  operator: string | null;
  dcc_status: string;
  fk_planning_id: number | null;
  assigned_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW:          'bg-blue-500/10 text-blue-500 border-blue-500/30',
  ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  ASSIGNED:     'bg-violet-500/10 text-violet-500 border-violet-500/30',
  REJECTED:     'bg-red-500/10 text-red-500 border-red-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW:    'bg-green-100 text-green-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function LocalizationCell({ loc }: { loc: any }) {
  if (!loc) return <span className="text-slate-400">—</span>;
  return (
    <div className="text-[11px] space-y-0.5">
      {loc.highway && <div><span className="font-semibold">Highway:</span> {loc.highway} ({loc.carriageway})</div>}
      {(loc.kmStart !== undefined) && <div><span className="font-semibold">km:</span> {loc.kmStart} – {loc.kmEnd}</div>}
      {loc.type && <div className="text-slate-400">{loc.type}</div>}
    </div>
  );
}

function WaypointCell({ wp }: { wp: any }) {
  if (!wp?.coordinates) return <span className="text-slate-400">—</span>;
  const [lng, lat, alt] = wp.coordinates;
  return (
    <div className="text-[11px] font-mono space-y-0.5">
      <div>{lat.toFixed(6)}, {lng.toFixed(6)}</div>
      {alt !== undefined && <div className="text-slate-400">alt: {alt}m</div>}
    </div>
  );
}

export default function FlightRequestsTable() {
  const { isDark } = useTheme();
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [assigning, setAssigning] = useState<number | null>(null);
  const [denying, setDenying] = useState<number | null>(null);

  const [planModal, setPlanModal] = useState<{ request_id: number; mission_id: string } | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      await axios.post('/api/planning/flight-requests/deny', { request_id });
      toast.success('Request denied');
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
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to acknowledge');
    } finally {
      setAssigning(null);
    }
  }

  async function openPlanModal(request_id: number, mission_id: string) {
    setPlanModal({ request_id, mission_id });
    setSelectedEvalId('');
    setEvalLoading(true);
    try {
      const { data } = await axios.get('/api/evaluation');
      setEvaluations(data.data ?? []);
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
      await axios.post('/api/planning/flight-requests/assign', {
        request_id: planModal.request_id,
        planning_id: Number(selectedEvalId),
      });
      toast.success('Flight request linked to planning mission');
      setPlanModal(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to move to planning');
    } finally {
      setSubmitting(false);
    }
  }

  const card = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const thCls = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const tdCls = `px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  return (
    <div className={`flex flex-col min-h-screen w-full ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className={`px-6 py-4 border-b ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Flight Requests
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Incoming mission requests from external services
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className={`h-8 text-xs w-36 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                {['ALL', 'NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'REJECTED'].map((s) => (
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

      <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: requests.length, icon: Send, color: 'text-violet-500' },
            { label: 'New', value: requests.filter((r) => r.dcc_status === 'NEW').length, icon: AlertCircle, color: 'text-blue-500' },
            { label: 'Acknowledged', value: requests.filter((r) => r.dcc_status === 'ACKNOWLEDGED').length, icon: Clock, color: 'text-yellow-500' },
            { label: 'Assigned', value: requests.filter((r) => r.dcc_status === 'ASSIGNED').length, icon: CheckCircle2, color: 'text-violet-500' },
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
        <div className={`rounded-xl border overflow-hidden shadow-sm ${card}`}>
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}>
              <tr>
                {['Mission ID', 'Type', 'Target', 'Localization', 'Waypoint', 'Start Date', 'Priority', 'Operator', 'Status', 'Received', 'Actions'].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-gray-50'}`}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={11} className={`py-14 text-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No flight requests found.
                  </td>
                </tr>
              ) : requests.map((r) => (
                <tr key={r.request_id} className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/80'}>
                  <td className={tdCls}>
                    <span className="font-mono font-semibold text-violet-400">{r.external_mission_id}</span>
                  </td>
                  <td className={tdCls}>{r.mission_type ?? '—'}</td>
                  <td className={tdCls}>{r.target ?? '—'}</td>
                  <td className={tdCls}><LocalizationCell loc={r.localization} /></td>
                  <td className={tdCls}><WaypointCell wp={r.waypoint} /></td>
                  <td className={tdCls}>
                    {r.start_datetime ? format(new Date(r.start_datetime), 'dd MMM yyyy HH:mm') : '—'}
                  </td>
                  <td className={tdCls}>
                    {r.priority ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[r.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.priority}
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`${tdCls} font-mono`}>{r.operator ?? '—'}</td>
                  <td className={tdCls}><StatusBadge status={r.dcc_status} /></td>
                  <td className={`${tdCls} text-[11px]`}>
                    {format(new Date(r.created_at), 'dd MMM HH:mm')}
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1.5">
                      {r.dcc_status === 'NEW' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(r.request_id)}
                          disabled={assigning === r.request_id || denying === r.request_id}
                          className={`h-7 text-xs gap-1 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
                        >
                          {assigning === r.request_id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle2 className="h-3 w-3" />}
                          Acknowledge
                        </Button>
                      )}
                      {r.dcc_status === 'ACKNOWLEDGED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPlanModal(r.request_id, r.external_mission_id)}
                          disabled={denying === r.request_id}
                          className={`h-7 text-xs gap-1 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
                        >
                          <Send className="h-3 w-3" />
                          Move to Planning
                        </Button>
                      )}
                      {(r.dcc_status === 'NEW' || r.dcc_status === 'ACKNOWLEDGED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeny(r.request_id)}
                          disabled={assigning === r.request_id || denying === r.request_id}
                          className={`h-7 text-xs gap-1 border-red-500/40 text-red-500 hover:bg-red-500/10 ${isDark ? 'hover:border-red-500/60' : ''}`}
                        >
                          {denying === r.request_id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <X className="h-3 w-3" />}
                          Deny
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl p-6 space-y-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Move to Planning
                </h2>
                <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {planModal.mission_id}
                </p>
              </div>
              <button
                onClick={() => setPlanModal(null)}
                className={`p-1 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Select a planning mission
              </p>
              {evalLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
                </div>
              ) : evaluations.length === 0 ? (
                <p className={`text-xs py-3 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  No planning missions found.
                </p>
              ) : (
                <div className={`rounded-lg border overflow-hidden divide-y max-h-56 overflow-y-auto ${isDark ? 'border-slate-700 divide-slate-700' : 'border-gray-200 divide-gray-100'}`}>
                  {evaluations.map((ev) => (
                    <button
                      key={ev.evaluation_id}
                      onClick={() => setSelectedEvalId(String(ev.evaluation_id))}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-xs
                        ${selectedEvalId === String(ev.evaluation_id)
                          ? isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-50 text-violet-700'
                          : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${selectedEvalId === String(ev.evaluation_id) ? 'bg-violet-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="font-mono font-semibold mr-2">EVAL_{ev.evaluation_id}</span>
                        <span className="font-medium">{ev.client_name}</span>
                        {ev.evaluation_desc && (
                          <span className={`ml-1 truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>— {ev.evaluation_desc}</span>
                        )}
                      </span>
                      <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                        {ev.evaluation_status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleMoveToPlan}
                disabled={!selectedEvalId || submitting}
                className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPlanModal(null)}
                className={`h-8 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
