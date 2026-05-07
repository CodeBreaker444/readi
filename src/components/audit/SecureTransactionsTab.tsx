'use client';

import { TablePagination } from '@/components/tables/Pagination';
import { verifyTransactionJWT } from '@/lib/crypto/transactionSign';
import { cn } from '@/lib/utils';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TransactionSign {
  id: string;
  user_id: number;
  user_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  jwt_token: string;
  payload_preview: Record<string, unknown> | null;
  public_key_snapshot: string;
  created_at: string;
}

type VerifyStatus = 'idle' | 'loading' | 'valid' | 'invalid';


const ACTION_COLORS: Record<string, { dark: string; light: string }> = {
  mission_start: { dark: 'bg-blue-500/10 text-blue-400 border-blue-500/30', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  mission_complete: { dark: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mission_revert: { dark: 'bg-amber-500/10 text-amber-400 border-amber-500/30', light: 'bg-amber-50 text-amber-700 border-amber-200' },
  component_detach: { dark: 'bg-orange-500/10 text-orange-400 border-orange-500/30', light: 'bg-orange-50 text-orange-700 border-orange-200' },
  drone_put_in_operation: { dark: 'bg-violet-500/10 text-violet-400 border-violet-500/30', light: 'bg-violet-50 text-violet-700 border-violet-200' },
  evaluation_done: { dark: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  evaluation_review: { dark: 'bg-sky-500/10 text-sky-400 border-sky-500/30', light: 'bg-sky-50 text-sky-700 border-sky-200' },
  planning_create: { dark: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', light: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

interface Props {
  isDark: boolean;
}

export function SecureTransactionsTab({ isDark }: Props) {
  const { t } = useTranslation();
  const [signs, setSigns] = useState<TransactionSign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [verifyMap, setVerifyMap] = useState<Map<string, VerifyStatus>>(new Map());
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const columns: ColumnDef<TransactionSign>[] = [];


  const table = useReactTable({
    data: signs,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pagination.pageSize),
    rowCount: total,
  });
  const fetchSigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/authorization/list', {
        params: { page: pagination.pageIndex + 1, page_size: pagination.pageSize },
      });
      if (data.code === 1) {
        setSigns(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (err) {
      console.log('Failed to load secure transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize]);

  useEffect(() => { fetchSigns(); }, [fetchSigns]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleVerify = async (sign: TransactionSign) => {
    setVerifyMap(prev => new Map(prev).set(sign.id, 'loading'));
    try {
      const { valid } = await verifyTransactionJWT(sign.jwt_token, sign.public_key_snapshot);
      setVerifyMap(prev => new Map(prev).set(sign.id, valid ? 'valid' : 'invalid'));
    } catch {
      setVerifyMap(prev => new Map(prev).set(sign.id, 'invalid'));
    }
  };

  const row = cn('border-b transition-colors', isDark ? 'border-white/[0.06] hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50/50');
  const cell = 'px-4 py-3 text-[11px]';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className={cn('h-5 w-5 animate-spin', isDark ? 'text-slate-500' : 'text-slate-400')} />
      </div>
    );
  }

  if (signs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ShieldCheck className={cn('h-10 w-10', isDark ? 'text-slate-600' : 'text-slate-300')} />
        <p className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>
          {t('auditLogs.transactions.noRecords')}
        </p>
        <p className={cn('text-xs', isDark ? 'text-slate-600' : 'text-slate-500')}>
          {t('auditLogs.transactions.noRecordsHint')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={cn('rounded-xl border overflow-hidden', isDark ? 'bg-[#0f1320] border-white/[0.06]' : 'bg-white border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]')}>
        <div className={cn('px-5 py-4 border-b flex items-center justify-between', isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
          <div>
            <h2 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{t('auditLogs.transactions.title')}</h2>
            <p className={cn('text-[11px] mt-0.5', isDark ? 'text-gray-500' : 'text-gray-400')}>
              {t('auditLogs.transactions.subtitle')}
            </p>
          </div>
          <button
            onClick={fetchSigns}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors', isDark ? 'border-white/[0.1] text-white hover:bg-white/[0.05]' : 'border-gray-200 hover:bg-gray-50')}
          >
            <RefreshCw size={12} /> {t('auditLogs.refresh')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn('text-[10px] font-bold uppercase tracking-wider', isDark ? 'border-b border-white/[0.06] bg-white/[0.02] text-slate-500' : 'border-b border-gray-100 bg-gray-50/50 text-gray-500')}>
                <th className="px-4 py-2.5 text-left w-8" />
                <th className="px-4 py-2.5 text-left">{t('auditLogs.transactions.colDateTime')}</th>
                <th className="px-4 py-2.5 text-left">{t('auditLogs.transactions.colAction')}</th>
                <th className="px-4 py-2.5 text-left">{t('auditLogs.transactions.colEntity')}</th>
                <th className="px-4 py-2.5 text-left">{t('auditLogs.transactions.colAuthorizedBy')}</th>
                <th className="px-4 py-2.5 text-left">{t('auditLogs.transactions.colIntegrity')}</th>
              </tr>
            </thead>
            <tbody>
              {signs.map(sign => {
                const isExpanded = expanded.has(sign.id);
                const verifyStatus = verifyMap.get(sign.id) ?? 'idle';
                const actionColor = ACTION_COLORS[sign.action_type];

                return (
                  <>
                    <tr
                      key={sign.id}
                      className={cn(row, 'cursor-pointer')}
                      onClick={() => toggleExpand(sign.id)}
                    >
                      <td className={cell}>
                        {isExpanded
                          ? <ChevronDown className={cn('h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-slate-400')} />
                          : <ChevronRight className={cn('h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-slate-400')} />
                        }
                      </td>
                      <td className={cell}>
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                          {new Date(sign.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <br />
                        <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                          {new Date(sign.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </td>
                      <td className={cell}>
                        <span className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold',
                          actionColor
                            ? (isDark ? actionColor.dark : actionColor.light)
                            : (isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200')
                        )}>
                          {t(`auditLogs.transactions.actions.${sign.action_type}`, sign.action_type.replace(/_/g, ' '))}
                        </span>
                      </td>
                      <td className={cn(cell, isDark ? 'text-slate-400' : 'text-slate-600')}>
                        <span className="capitalize">{sign.entity_type.replace(/_/g, ' ')}</span>
                        {sign.entity_id && (
                          <span className={isDark ? 'text-slate-600' : 'text-slate-400'}> #{sign.entity_id}</span>
                        )}
                      </td>
                      <td className={cell}>
                        <span className={cn('font-medium', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {sign.user_name ?? t('auditLogs.transactions.unknown')}
                        </span>
                      </td>
                      <td className={cell} onClick={e => e.stopPropagation()}>
                        {verifyStatus === 'idle' && (
                          <button
                            onClick={() => handleVerify(sign)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors',
                              isDark ? 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10' : 'border-violet-300 text-violet-600 hover:bg-violet-50'
                            )}
                          >
                            <ShieldCheck className="h-3 w-3" /> {t('auditLogs.transactions.verify')}
                          </button>
                        )}
                        {verifyStatus === 'loading' && (
                          <span className={cn('flex items-center gap-1 text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                            <RefreshCw className="h-3 w-3 animate-spin" /> {t('auditLogs.transactions.checking')}
                          </span>
                        )}
                        {verifyStatus === 'valid' && (
                          <span className={cn('flex items-center gap-1 text-[10px] font-semibold', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t('auditLogs.transactions.valid')}
                          </span>
                        )}
                        {verifyStatus === 'invalid' && (
                          <span className={cn('flex items-center gap-1 text-[10px] font-semibold', isDark ? 'text-red-400' : 'text-red-600')}>
                            <XCircle className="h-3.5 w-3.5" /> {t('auditLogs.transactions.tampered')}
                          </span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${sign.id}-detail`} className={isDark ? 'border-b border-white/[0.06]' : 'border-b border-gray-100'}>
                        <td colSpan={6} className="px-4 pb-3 pt-0">
                          <div className={cn('rounded-lg border p-3 text-[11px] grid grid-cols-1 md:grid-cols-2 gap-4', isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200')}>
                            {/* Payload Preview */}
                            {sign.payload_preview && (
                              <div>
                                <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{t('auditLogs.transactions.actionDetails')}</p>
                                <div className="space-y-1">
                                  {Object.entries(sign.payload_preview).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                      <span className={cn('font-medium capitalize min-w-24', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                        {k.replace(/_/g, ' ')}
                                      </span>
                                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                        {String(v)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* JWT + Public Key Fingerprint */}
                            <div>
                              <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{t('auditLogs.transactions.cryptoRecord')}</p>
                              <div className="space-y-1">
                                <div>
                                  <span className={cn('font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>{t('auditLogs.transactions.transactionId')} </span>
                                  <span className={cn('font-mono', isDark ? 'text-slate-400' : 'text-slate-500')}>{sign.id.slice(0, 8)}…</span>
                                </div>
                                <div>
                                  <span className={cn('font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>{t('auditLogs.transactions.jwtLabel')} </span>
                                  <span className={cn('font-mono break-all', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                    {sign.jwt_token.slice(0, 48)}…
                                  </span>
                                </div>
                                <div>
                                  <span className={cn('font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>{t('auditLogs.transactions.publicKey')} </span>
                                  <span className={cn('font-mono break-all', isDark ? 'text-slate-500' : 'text-slate-400')}>
                                    {sign.public_key_snapshot.slice(0, 48)}…
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <TablePagination table={table} />
      </div>

      <div className={cn('mt-3 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs', isDark ? 'bg-violet-500/5 border-violet-500/20 text-violet-400' : 'bg-violet-50 border-violet-200 text-violet-700')}>
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        <span>
          {t('auditLogs.transactions.infoBannerPre')} <strong>{t('auditLogs.transactions.valid')}</strong> {t('auditLogs.transactions.infoBannerPost')}
        </span>
      </div>
    </div>
  );
}
