'use client';

import type { FlightRequest } from '@/components/tables/flightRequestsColumns';
import { ZoneBadge } from '@/components/tables/flightRequestsColumns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/tables/Pagination';
import { toastAfterDccAction } from '@/lib/dcc-toast';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { getCoreRowModel, getPaginationRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import axios from 'axios';
import { format } from 'date-fns';
import { Link2, Loader2, Plus, ShieldCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface LinkableMission {
  pilot_mission_id: number;
  mission_code: string | null;
  mission_name: string | null;
  status_name: string | null;
  scheduled_start: string | null;
  tool_code: string | null;
  client_name: string | null;
  opm_approval_status: string | null;
  zone_covered: boolean;
  linked_request_count: number;
}

const PAGE_SIZE = 6;

interface Props {
  request: FlightRequest | null;
  isDark: boolean;
  onClose: () => void;
  onLinked: () => void;
}

/**
 * "Link to Mission" for an acknowledged flight request: create a new mission
 * (opens Mission Table → New Mission, prefilled from the request) or link an
 * existing planned / in-progress mission.
 */
export function FlightRequestLinkMissionModal({ request, isDark, onClose, onLinked }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [missions, setMissions] = useState<LinkableMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setSelected(null);
    setMissions([]);
    if (!request) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`/api/planning/flight-requests/${request.request_id}/linkable-missions`)
      .then(({ data }) => { if (!cancelled) setMissions(data.items ?? []); })
      .catch(() => { if (!cancelled) toast.error(t('planning.flightRequests.link.loadError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [request?.request_id, t]);

  const columns = useMemo<ColumnDef<LinkableMission>[]>(() => [{ id: 'mission', accessorKey: 'pilot_mission_id' }], []);
  const table = useReactTable({
    data: missions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  if (!request) return null;

  async function handleLink() {
    if (!request || selected == null) return;
    setLinking(true);
    try {
      const { data } = await axios.post<{ code: number; dcc?: DccCallbackResult; autoApproved?: boolean }>(
        '/api/planning/flight-requests/link',
        { request_id: request.request_id, mission_id: selected },
      );
      toastAfterDccAction(
        data.autoApproved ? t('planning.flightRequests.link.successAutoApproved') : t('planning.flightRequests.link.success'),
        data.dcc,
      );
      onLinked();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('planning.flightRequests.link.error'));
    } finally {
      setLinking(false);
    }
  }

  function handleCreate() {
    if (!request) return;
    router.push(`/operations/table?flightRequest=${request.request_id}`);
  }

  const bg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const muted = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col h-[720px] max-h-[90vh] ${bg}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-start justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${muted}`}>{t('planning.flightRequests.link.title')}</p>
            <h2 className={`text-base font-semibold font-mono truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{request.external_mission_id}</h2>
            <div className="mt-1.5"><ZoneBadge r={request} t={t} /></div>
          </div>
          <button onClick={onClose} className={`cursor-pointer p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <Button onClick={handleCreate} className="w-full h-10 cursor-pointer text-xs bg-violet-600 hover:bg-violet-500 text-white gap-2">
            <Plus className="h-4 w-4" />
            {t('planning.flightRequests.link.createNew')}
          </Button>
          <p className={`text-[11px] ${muted}`}>{t('planning.flightRequests.link.createNewHint')}</p>

          <div className={`flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider ${muted}`}>
            <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            {t('planning.flightRequests.link.orExisting')}
            <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : missions.length === 0 ? (
            <p className={`text-sm text-center py-6 ${muted}`}>{t('planning.flightRequests.link.noMissions')}</p>
          ) : (
            <div>
              {/* Fixed height while paginated so changing page doesn't resize the modal. */}
              <div className={`space-y-2 ${missions.length > PAGE_SIZE ? 'h-[430px] overflow-y-auto pr-1' : ''}`}>
              {table.getRowModel().rows.map(({ original: m }) => {
                const active = selected === m.pilot_mission_id;
                return (
                  <button
                    key={m.pilot_mission_id}
                    type="button"
                    onClick={() => setSelected(m.pilot_mission_id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${active
                      ? 'border-violet-500 bg-violet-500/10'
                      : isDark ? 'border-slate-700 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-xs font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{m.mission_code ?? `#${m.pilot_mission_id}`}</span>
                      <span className={`text-[10px] ${muted}`}>{m.status_name?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className={`text-[11px] mt-0.5 truncate ${muted}`}>
                      {[m.mission_name, m.tool_code, m.scheduled_start ? format(new Date(m.scheduled_start), 'dd MMM yyyy HH:mm') : null].filter(Boolean).join(' · ')}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {m.linked_request_count > 0 && (
                        <span
                          title={t('planning.flightRequests.linkedRequestsTitle', { count: m.linked_request_count })}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-500"
                        >
                          <Link2 className="h-3 w-3" /> {t('planning.flightRequests.linkedRequests', { count: m.linked_request_count })}
                        </span>
                      )}
                      {m.zone_covered && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-600">
                          <ShieldCheck className="h-3 w-3" /> {t('planning.flightRequests.link.noOpmNeeded')}
                        </span>
                      )}
                      {m.opm_approval_status === 'PENDING' && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                          {m.zone_covered ? t('planning.flightRequests.link.willAutoApprove') : t('planning.flightRequests.link.awaitingOpm')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              </div>
              {missions.length > PAGE_SIZE && <TablePagination table={table} pageSizeOptions={[6, 12, 24]} />}
            </div>
          )}
        </div>

        <div className={`px-6 py-4 border-t flex justify-end gap-2 ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <Button variant="outline" onClick={onClose} className={`h-9 text-xs cursor-pointer ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent' : ''}`}>
            {t('common.cancel')}
          </Button>
          <Button disabled={selected == null || linking} onClick={handleLink} className="h-9 text-xs cursor-pointer bg-violet-600 hover:bg-violet-500 text-white gap-2">
            {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            {t('planning.flightRequests.link.linkSelected')}
          </Button>
        </div>
      </div>
    </div>
  );
}
