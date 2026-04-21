'use client';

import { TablePagination } from '@/components/tables/Pagination';
import {
  SafetyTargetProposal,
  getSafetyTargetProposalColumns,
} from '@/components/tables/SafetyTargetProposalColumn';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTheme } from '@/components/useTheme';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Target,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';


type ActionType = 'APPROVED' | 'REJECTED';


export default function SafetyTargetReviewPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [proposals, setProposals] = useState<SafetyTargetProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState('6');
  const [summary, setSummary] = useState('');

  const [actionTarget, setActionTarget] = useState<SafetyTargetProposal | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionType>('APPROVED');
  const [notes, setNotes] = useState('');
  const [actioning, setActioning] = useState(false);


  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/compliance/safety-target-review/generate?months=${months}`);
      if (res.data.code === 1) {
        setProposals(res.data.data ?? []);
        setSummary(t('compliance.safetyTargetReview.generatedSummary', { pending: res.data.total_pending, months: res.data.months }));
      } else {
        toast.error(res.data.error || t('compliance.safetyTargetReview.messages.generateFailed'));
      }
    } catch {
      toast.error(t('compliance.safetyTargetReview.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);


  const columns = useMemo(
    () =>
      getSafetyTargetProposalColumns(
        isDark,
        (row) => { setActionTarget(row); setPendingAction('APPROVED'); setNotes(''); },
        (row) => { setActionTarget(row); setPendingAction('REJECTED'); setNotes(''); },
        t
      ),
    [isDark, t]
  );

  const table = useReactTable({
    data: proposals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });


  const stats = useMemo(() => ({
    total: proposals.length,
    pending: proposals.filter((p) => p.status === 'PENDING').length,
    approved: proposals.filter((p) => p.status === 'APPROVED').length,
    rejected: proposals.filter((p) => p.status === 'REJECTED').length,
  }), [proposals]);


  async function handleAction() {
    if (!actionTarget) return;
    setActioning(true);
    try {
      const res = await axios.post('/api/compliance/safety-target-review/approve', {
        proposal_id: actionTarget.proposal_id,
        action: pendingAction,
        notes: notes.trim() || null,
      });
      if (res.data.code === 1) {
        toast.success(res.data.message);
        setActionTarget(null);
        fetchProposals();
      } else {
        toast.error(res.data.error || t('compliance.safetyTargetReview.messages.actionFailed'));
      }
    } catch {
      toast.error(t('compliance.safetyTargetReview.messages.actionFailed'));
    } finally {
      setActioning(false);
    }
  }


  const bg = isDark ? 'bg-[#0a0e1a]' : 'bg-[#f4f6f9]';
  const cardBg = isDark ? 'bg-[#0f1320] border-white/6' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputCls = isDark
    ? 'bg-white/4 border-white/8 text-white placeholder-gray-600 focus:border-violet-500/50'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400';
  const borderMuted = isDark ? 'border-white/6' : 'border-gray-100';
  const btnOutline = isDark
    ? 'border-white/10 hover:bg-white/5 text-white'
    : 'border-gray-200 hover:bg-gray-50 text-gray-700';
  const tableHeadBg = isDark ? 'bg-white/2' : 'bg-gray-50/50';
  const selectTrigger = isDark ? 'bg-white/4 border-white/8 text-white' : 'bg-gray-50 border-gray-200';

  const monthOptions = ['3', '6', '12'] as const;

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className={`backdrop-blur-xl border-b ${isDark ? 'bg-[#0a0e1a]/90 border-white/6' : 'bg-white/80 border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
        <div className="mx-auto px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-1 h-6 rounded-full bg-violet-600" />
            <div>
              <h1 className={`text-[15px] font-semibold tracking-[-0.01em] ${textPrimary}`}>
                {t('compliance.safetyTargetReview.title')} — {t('compliance.safetyTargetReview.subtitle')}
              </h1>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                {summary || t('compliance.safetyTargetReview.tableSubtitle', { months })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${textMuted}`}>{t('compliance.safetyTargetReview.monthsSelector.label')}</span>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger className={`h-8 w-28 text-xs ${selectTrigger}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`compliance.safetyTargetReview.monthsSelector.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={fetchProposals}
              disabled={loading}
              className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
              {loading ? t('compliance.safetyTargetReview.generating') : t('compliance.safetyTargetReview.generate')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-6 space-y-5">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { labelKey: 'compliance.safetyTargetReview.stats.totalIndicators', value: stats.total, icon: Target, color: 'text-violet-400', iconBg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
            { labelKey: 'compliance.safetyTargetReview.stats.pendingReview', value: stats.pending, icon: Clock, color: 'text-amber-400', iconBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
            { labelKey: 'compliance.safetyTargetReview.stats.approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-400', iconBg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
            { labelKey: 'compliance.safetyTargetReview.stats.rejected', value: stats.rejected, icon: XCircle, color: 'text-red-400', iconBg: isDark ? 'bg-red-500/10' : 'bg-red-50' },
          ] as const).map(({ labelKey, value, icon: Icon, color, iconBg }) => (
            <div key={labelKey} className={`rounded-xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>{t(labelKey)}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <Icon size={14} className={color} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b ${borderMuted}`}>
            <h2 className={`text-sm font-semibold ${textPrimary}`}>
              {t('compliance.safetyTargetReview.table.sectionTitle')}
            </h2>
            <p className={`text-[11px] mt-0.5 ${textMuted}`}>
              {t('compliance.safetyTargetReview.tableSubtitle', { months })}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className={`${borderMuted} ${tableHeadBg}`}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className={borderMuted}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <div className={`h-3 rounded animate-pulse ${isDark ? 'bg-white/6' : 'bg-gray-100'}`} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : proposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-20 text-center">
                      <Target size={32} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                      <p className={`text-sm ${textMuted}`}>{t('compliance.safetyTargetReview.table.empty')}</p>
                      <p className={`text-xs mt-1 ${textMuted}`}>
                        {t('compliance.safetyTargetReview.table.emptyHint', { months })}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`border-b transition-colors ${isDark ? `${borderMuted} hover:bg-white/2` : `${borderMuted} hover:bg-gray-50/50`}`}
                    >
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
          <TablePagination table={table}/>
        </div>
      </div>

      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderMuted}`}>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>
                {pendingAction === 'APPROVED'
                  ? t('compliance.safetyTargetReview.actionModal.approveTitle')
                  : t('compliance.safetyTargetReview.actionModal.rejectTitle')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setActionTarget(null)} className={`h-7 w-7 ${isDark ? 'text-gray-400 hover:bg-white/8' : ''}`}>
                <X size={15} />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className={`rounded-lg p-3 space-y-1 ${isDark ? 'bg-white/4' : 'bg-gray-50'}`}>
                <p className={`text-xs font-semibold ${textPrimary}`}>{actionTarget.indicator_name}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className={textMuted}>
                    {t('compliance.safetyTargetReview.actionModal.fields.area')}:{' '}
                    <span className={textPrimary}>{actionTarget.indicator_area}</span>
                  </span>
                  <span className={textMuted}>
                    {t('compliance.safetyTargetReview.actionModal.fields.indicator')}:{' '}
                    <span className={textPrimary}>{actionTarget.indicator_type}</span>
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className={textMuted}>
                    {t('compliance.safetyTargetReview.actionModal.fields.currentTarget')}:{' '}
                    <span className={`font-semibold ${textPrimary}`}>{actionTarget.target_current}</span>
                  </span>
                  <span className={textMuted}>
                    {t('compliance.safetyTargetReview.actionModal.fields.suggestedTarget')}:{' '}
                    <span className={`font-semibold ${pendingAction === 'APPROVED' ? 'text-emerald-400' : textPrimary}`}>{actionTarget.target_suggested}</span>
                  </span>
                  <span className={textMuted}>
                    {t('compliance.safetyTargetReview.actionModal.fields.delta')}:{' '}
                    <span className={`font-semibold ${actionTarget.diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{actionTarget.diff > 0 ? '+' : ''}{actionTarget.diff}</span>
                  </span>
                </div>
              </div>

              {pendingAction === 'APPROVED' && (
                <div className={`flex items-start gap-2 p-3 rounded-lg ${isDark ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className={`text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {t('compliance.safetyTargetReview.actionModal.alerts.approve')}
                  </p>
                </div>
              )}

              {pendingAction === 'REJECTED' && (
                <div className={`flex items-start gap-2 p-3 rounded-lg ${isDark ? 'bg-red-500/8 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    {t('compliance.safetyTargetReview.actionModal.alerts.reject')}
                  </p>
                </div>
              )}

              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${textMuted}`}>
                  {t('compliance.safetyTargetReview.actionModal.fields.notes')}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('compliance.safetyTargetReview.actionModal.fields.notesPlaceholder')}
                  className={`w-full rounded-md border px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${inputCls}`}
                />
              </div>
            </div>

            <div className={`flex justify-end gap-2 px-6 py-4 border-t ${borderMuted}`}>
              <Button variant="outline" size="sm" onClick={() => setActionTarget(null)} className={`h-8 text-xs ${isDark ? 'border-white/8 hover:bg-white/5 text-gray-300' : btnOutline}`}>
                {t('compliance.safetyTargetReview.actionModal.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleAction}
                disabled={actioning}
                className={`h-8 text-xs text-white ${pendingAction === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {actioning
                  ? t('compliance.safetyTargetReview.actionModal.processing')
                  : pendingAction === 'APPROVED'
                    ? t('compliance.safetyTargetReview.actionModal.approve')
                    : t('compliance.safetyTargetReview.actionModal.reject')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
