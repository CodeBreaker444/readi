'use client';

import '@/lib/i18n/config';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Unlink,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';
import type { FleetRow } from '@/types/dflight';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:          'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  UNDERMAINTENANCE:'bg-amber-500/10 text-amber-500 border-amber-500/30',
  DELETED:         'bg-red-500/10 text-red-500 border-red-500/30',
};

export default function DFlightFleet() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [rows, setRows]       = useState<FleetRow[]>([]);
  const [error, setError]     = useState<string | null>(null);

  const card = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const th   = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const td   = `px-4 py-3 text-xs align-middle ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ code: number; data: FleetRow[]; message?: string }>('/api/dflight/fleet');
      if (data.code === 0) {
        setError(data.message ?? t('dflight.fleet.error.generic'));
        setRows([]);
      } else {
        setRows(data.data ?? []);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('dflight.fleet.error.generic');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const linked   = rows.filter((r) => r.linked);
  const unlinked = rows.filter((r) => !r.linked);

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: t('dflight.fleet.stat.total'),   value: rows.length,    color: isDark ? 'text-white' : 'text-slate-900' },
          { label: t('dflight.fleet.stat.linked'),  value: linked.length,  color: 'text-emerald-500' },
          { label: t('dflight.fleet.stat.unlinked'),value: unlinked.length, color: 'text-amber-500' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-slate-700/60 bg-slate-800/60' : 'border-gray-100 bg-gray-50/80'}`}>
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('dflight.fleet.tableTitle')}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('dflight.fleet.tableSubtitle')}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {t('dflight.fleet.refresh')}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className={`h-5 w-5 animate-spin ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('dflight.fleet.loading')}
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{error}</p>
            <button
              onClick={load}
              className="text-xs text-sky-500 hover:underline"
            >
              {t('dflight.fleet.retry')}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('dflight.fleet.empty')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-slate-700/40' : 'bg-gray-50/80'}>
                <tr>
                  <th className={th}>{t('dflight.fleet.col.link')}</th>
                  <th className={th}>{t('dflight.fleet.col.system')}</th>
                  <th className={th}>{t('dflight.fleet.col.component')}</th>
                  <th className={th}>{t('dflight.fleet.col.serialNumber')}</th>
                  <th className={th}>{t('dflight.fleet.col.drc')}</th>
                  <th className={th}>{t('dflight.fleet.col.dFlightName')}</th>
                  <th className={th}>{t('dflight.fleet.col.model')}</th>
                  <th className={th}>{t('dflight.fleet.col.status')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-gray-100'}`}>
                {rows.map((row) => (
                  <tr
                    key={row.componentId}
                    className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/60'}
                  >
                    <td className={td}>
                      {row.linked
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <Unlink className={`h-4 w-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />}
                    </td>
                    <td className={td}>
                      <span className="font-medium">{row.systemName}</span>
                    </td>
                    <td className={td}>{row.componentName}</td>
                    <td className={td}>
                      {row.serialNumber
                        ? <code className={`text-[11px] ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{row.serialNumber}</code>
                        : <span className={isDark ? 'text-slate-600' : 'text-gray-300'}>—</span>}
                    </td>
                    <td className={td}>
                      {row.dFlightId
                        ? <code className={`text-[11px] font-semibold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{row.dFlightId}</code>
                        : <span className={isDark ? 'text-slate-600' : 'text-gray-300'}>—</span>}
                    </td>
                    <td className={td}>{row.dFlightDroneName ?? '—'}</td>
                    <td className={td}>
                      <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {row.dFlightModel ?? '—'}
                      </span>
                    </td>
                    <td className={td}>
                      {row.dFlightStatus ? (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[row.dFlightStatus] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {row.dFlightStatus}
                        </span>
                      ) : (
                        <XCircle className={`h-3.5 w-3.5 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
