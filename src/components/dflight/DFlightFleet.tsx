'use client';

import '@/lib/i18n/config';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import axios from 'axios';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import Link from 'next/link';

import type { DFlightDroneRow } from '@/types/dflight';
import { ColumnMeta, fleetColumns } from '../tables/DFlightColumn';
import { TablePagination } from '../tables/Pagination';
import { Skeleton } from '../ui/skeleton';
import { useTheme } from '../useTheme';
import ImportDroneModal from './ImportDroneModal';


export default function DFlightFleet() {
  const { t }      = useTranslation();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [rows, setRows]       = useState<DFlightDroneRow[]>([]);
  const [models, setModels]   = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [error, setError]     = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [importDrone, setImportDrone] = useState<DFlightDroneRow | null>(null);

  const [page, setPage]         = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [syncingComponentId, setSyncingComponentId] = useState<number | null>(null);

  const card = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const th   = `px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`;
  const td   = `px-4 py-3 text-xs align-middle ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  const loadModels = useCallback(async () => {
    try {
      const { data } = await axios.post('/api/system/model/list', {});
      if (data.code === 1) setModels(data.data ?? []);
    } catch {
      setModels([]);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/client/list');
      if (data.code === 1) setClients(data.data ?? []);
    } catch {
      setClients([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const { data } = await axios.get<{ code: number; data: DFlightDroneRow[]; message?: string }>(
        '/api/dflight/fleet',
      );
      if (data.code === 0) {
        if (data.message === 'D-Flight integration not configured') {
          setNotConfigured(true);
          setRows([]);
        } else {
          setError(data.message ?? t('dflight.fleet.error.generic'));
          setRows([]);
        }
      } else {
        setRows(data.data ?? []);
        setPage(0);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('dflight.fleet.error.generic');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); loadModels(); loadClients(); }, [load, loadModels, loadClients]);

  const handleImported = useCallback(() => {
    setImportDrone(null);
    load();
    loadModels();
  }, [load, loadModels]);

  const handleSync = useCallback(async (row: DFlightDroneRow) => {
    if (!row.componentId || !row.dFlightId) return;
    setSyncingComponentId(row.componentId);
    try {
      const { data } = await axios.post('/api/dflight/sync', {
        componentId: row.componentId,
        dFlightId: row.dFlightId,
        uas_serial_number: row.uasSerialNumber ?? null,
        gcs_serial_number: row.gcsSerialNumber ?? null,
        insurance_company: row.insuranceCompany ?? null,
        insurance_expiry_date: row.insuranceExpiryDate ?? null,
        qr_code_image: row.qrCodeImage ?? null,
      });
      if (data.code === 1) {
        toast.success(t('dflight.fleet.sync.success', { defaultValue: 'Component synced from D-Flight' }));
        load();
      } else {
        toast.error(data.message || t('dflight.fleet.sync.failed', { defaultValue: 'Failed to sync component' }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('dflight.fleet.sync.error', { defaultValue: 'An error occurred while syncing' }));
    } finally {
      setSyncingComponentId(null);
    }
  }, [load, t]);

  const table = useReactTable<DFlightDroneRow>({
    data:     rows,
    columns:  fleetColumns,
    meta:     { isDark, onImport: setImportDrone, onSync: handleSync, syncingComponentId } satisfies ColumnMeta,
    manualPagination: false,
    state: {
      pagination: { pageIndex: page, pageSize: rowsPerPage },
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater({ pageIndex: page, pageSize: rowsPerPage })
        : updater;
      setPage(next.pageIndex);
      setRowsPerPage(next.pageSize);
    },
    getCoreRowModel:       getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const linked   = rows.filter((r) => r.linked).length;
  const unlinked = rows.length - linked;

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
    table.setPageIndex(newPage);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    setRowsPerPage(size);
    setPage(0);
    table.setPageSize(size);
    table.setPageIndex(0);
  };

 

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-3 gap-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl border p-4 ${card}`}>
              <Skeleton className="h-7 w-12 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
        ) : (
          [
            { label: t('dflight.fleet.stat.total'),     value: rows.length, color: isDark ? 'text-white'       : 'text-slate-900' },
            { label: t('dflight.fleet.stat.linked'),    value: linked,      color: 'text-emerald-500' },
            { label: t('dflight.fleet.stat.unlinked'),  value: unlinked,    color: 'text-amber-500'   },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${card}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{s.label}</p>
            </div>
          ))
        )}
      </div>

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
            className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {t('dflight.fleet.refresh')}
          </button>
        </div>

        {/* States */}
        {loading ? (
          <div className="p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-24 flex-shrink-0" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-20 flex-shrink-0" />
                  <Skeleton className="h-10 w-16 flex-shrink-0" />
                  <Skeleton className="h-10 w-16 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : notConfigured ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Settings className="h-10 w-10 text-slate-400" />
            <div className="text-center space-y-2">
              <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                {t('dflight.fleet.notConfigured.title')}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                {t('dflight.fleet.notConfigured.description')}
              </p>
            </div>
            <Link
              href="/dflight/settings"
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                isDark
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              {t('dflight.fleet.notConfigured.setup')}
            </Link>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{error}</p>
            <button onClick={load} className="text-xs text-sky-500 hover:underline">
              {t('dflight.fleet.retry')}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('dflight.fleet.empty')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDark ? 'bg-slate-700/40' : 'bg-gray-50/80'}>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th key={header.id} className={th} style={{ width: header.getSize() }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700/40' : 'divide-gray-100'}`}>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={isDark ? 'hover:bg-slate-700/20' : 'hover:bg-gray-50/60'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className={td}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination table={table} />
          </>
        )}
      </div>

      <ImportDroneModal
        open={!!importDrone}
        onClose={() => setImportDrone(null)}
        onImported={handleImported}
        drone={importDrone}
        models={models}
        clients={clients}
        onModelsRefresh={loadModels}
      />
    </div>
  );
}