'use client';

import { OpmApprovalBadge } from '@/components/operation/OpmApprovalBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { showDFlightErrorToast } from '@/lib/dflight-toast';
import { useTimezone } from '@/components/TimezoneProvider';
import { cn, formatDateTimeInTz } from '@/lib/utils';
import axios from 'axios';
import { Check, ChevronLeft, ChevronRight, Inbox, Loader2, Repeat, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export interface InternalFlightRequest {
  request_id: number;
  mission_ids: number[];
  mission_code: string | null;
  mission_name: string | null;
  mission_type: string | null;
  op_type: string | null;
  location: string | null;
  scheduled_start: string | null;
  occurrences: number;
  pilot_name: string | null;
  requested_by_name: string | null;
  department: string | null;
  tool_code: string | null;
  notes: string | null;
  approval_status: 'PENDING' | 'APPROVED' | 'DENIED';
  requested_at: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  decided_by_admin?: boolean;
  decision_note: string | null;
}

const COLUMNS = ['mission', 'pilot', 'schedule', 'department', 'status', 'actions'] as const;

interface Props {
  isDark: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  refreshKey: number;
  onPendingCountChange?: (count: number) => void;
}

const PAGE_SIZE = 8;
const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'DENIED'];

export function InternalFlightRequests({ isDark, filter, onFilterChange, refreshKey, onPendingCountChange }: Props) {
  const { t } = useTranslation();
  const { timezone } = useTimezone();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<InternalFlightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [denyTarget, setDenyTarget] = useState<InternalFlightRequest | null>(null);
  const [denyNote, setDenyNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/operation/approvals', { params: { status: filter } });
      const list: InternalFlightRequest[] = data.items ?? [];
      setItems(list);
      setPage(0);
      if (filter === 'PENDING') onPendingCountChange?.(list.length);
    } catch {
      toast.error(t('operations.opmApproval.requests.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filter, onPendingCountChange, t]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function decide(req: InternalFlightRequest, decision: 'APPROVED' | 'DENIED', note?: string) {
    setBusyId(req.request_id);
    try {
      const { data } = await axios.post('/api/operation/approvals/decide', {
        mission_id: req.request_id,
        decision,
        ...(note?.trim() ? { note: note.trim() } : {}),
      });
      toast.success(t(decision === 'APPROVED' ? 'operations.opmApproval.requests.approvedToast' : 'operations.opmApproval.requests.deniedToast'));
      (data.dflight_errors ?? []).forEach((e: { missionCode: string; message: string }) =>
        showDFlightErrorToast(t('operations.newOperation.toast.dflightAuthError', { missionCode: e.missionCode }), e.message),
      );
      setDenyTarget(null);
      setDenyNote('');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('operations.opmApproval.requests.decideError'));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const card = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const muted = isDark ? 'text-slate-500' : 'text-gray-400';
  const thCls = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${muted}`;
  const tdCls = `px-4 py-3 text-xs align-top ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  return (
    <div className="max-w-[1600px] mx-auto w-full px-6 py-6">
      <div className="flex items-center gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={cn(
              'h-7 rounded-full px-3 text-xs font-medium border cursor-pointer transition-colors',
              filter === f
                ? 'bg-violet-600 border-violet-600 text-white'
                : isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {t(`operations.opmApproval.requests.filters.${f}`)}
          </button>
        ))}
      </div>
      <div className={`rounded-xl border shadow-sm ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className={isDark ? 'bg-slate-700/50' : 'bg-gray-50/80'}>
              <tr>
                {COLUMNS.map((c) => <th key={c} className={thCls}>{t(`operations.opmApproval.requests.columns.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-gray-50'}`}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {COLUMNS.map((c) => <td key={c} className="px-4 py-3"><Skeleton className="h-4 w-full rounded" /></td>)}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className={`py-14 text-center text-sm ${muted}`}>
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    {t('operations.opmApproval.requests.empty')}
                  </td>
                </tr>
              ) : pageItems.map((r) => (
                <tr key={r.request_id} className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/80'}>
                  <td className={tdCls}>
                    <div className="font-semibold">{r.mission_code}</div>
                    <div className={muted}>{r.mission_name || r.mission_type || '—'}</div>
                    {r.location && <div className={muted}>{r.location}</div>}
                    {r.occurrences > 1 && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-violet-500">
                        <Repeat className="h-3 w-3" /> {t('operations.opmApproval.requests.occurrences', { count: r.occurrences })}
                      </span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <div>{r.pilot_name ?? '—'}</div>
                    {r.requested_by_name && r.requested_by_name !== r.pilot_name && (
                      <div className={muted}>{t('operations.opmApproval.requests.requestedBy', { name: r.requested_by_name })}</div>
                    )}
                  </td>
                  <td className={tdCls}>
                    {r.scheduled_start ? formatDateTimeInTz(r.scheduled_start, timezone) : '—'}
                    {r.tool_code && <div className={muted}>{r.tool_code}</div>}
                  </td>
                  <td className={tdCls}>{r.department ?? '—'}</td>
                  <td className={tdCls}>
                    <OpmApprovalBadge status={r.approval_status} decidedByAdmin={r.decided_by_admin} isDark={isDark} />
                    {r.approval_status !== 'PENDING' && r.decided_by_name && (
                      <div className={`mt-1 ${muted}`}>
                        {r.decided_by_name}{r.decided_at ? ` · ${formatDateTimeInTz(r.decided_at, timezone)}` : ''}
                      </div>
                    )}
                    {r.decision_note && <div className={`mt-0.5 italic ${muted}`}>&ldquo;{r.decision_note}&rdquo;</div>}
                  </td>
                  <td className={tdCls}>
                    {r.approval_status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === r.request_id}
                          onClick={() => decide(r, 'APPROVED')}
                          className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          {busyId === r.request_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          {t('operations.opmApproval.requests.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.request_id}
                          onClick={() => { setDenyTarget(r); setDenyNote(''); }}
                          className="h-7 gap-1 text-xs border-red-500/40 text-red-500 hover:bg-red-500/10 cursor-pointer"
                        >
                          <X className="h-3 w-3" /> {t('operations.opmApproval.requests.deny')}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {items.length > PAGE_SIZE && (
        <div className={`flex items-center justify-between pt-3 text-xs ${muted}`}>
          <span>{t('operations.opmApproval.requests.pageOf', { page: page + 1, total: pageCount, count: items.length })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={cn('h-7 gap-1 text-xs cursor-pointer', isDark && 'border-slate-600 text-slate-300 hover:bg-slate-700')}>
              <ChevronLeft className="h-3.5 w-3.5" /> {t('operations.newOperation.buttons.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} className={cn('h-7 gap-1 text-xs cursor-pointer', isDark && 'border-slate-600 text-slate-300 hover:bg-slate-700')}>
              {t('operations.newOperation.buttons.next')} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!denyTarget} onOpenChange={(open) => { if (!open) setDenyTarget(null); }}>
        <DialogContent className={isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : ''}>
          <DialogHeader>
            <DialogTitle>{t('operations.opmApproval.requests.denyTitle', { code: denyTarget?.mission_code })}</DialogTitle>
            <DialogDescription>{t('operations.opmApproval.requests.denyDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={denyNote}
            maxLength={500}
            onChange={(e) => setDenyNote(e.target.value)}
            placeholder={t('operations.opmApproval.requests.denyPlaceholder')}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyTarget(null)} className="cursor-pointer">{t('common.cancel')}</Button>
            <Button
              disabled={busyId !== null}
              onClick={() => denyTarget && decide(denyTarget, 'DENIED', denyNote)}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {busyId !== null && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t('operations.opmApproval.requests.deny')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
