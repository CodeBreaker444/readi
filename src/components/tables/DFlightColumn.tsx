import type { DFlightDroneRow } from '@/types/dflight';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle2, Unlink, UploadCloud, XCircle } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:           'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  UNDERMAINTENANCE: 'bg-amber-500/10  text-amber-500  border-amber-500/30',
  DELETED:          'bg-red-500/10    text-red-500    border-red-500/30',
};

const helper = createColumnHelper<DFlightDroneRow>();

export type ColumnMeta = { isDark: boolean; onImport?: (row: DFlightDroneRow) => void };

export const fleetColumns = [
  helper.accessor('linked', {
    id:     'link',
    header: 'Link',
    cell:   ({ getValue, table }) => {
      const dark = (table.options.meta as ColumnMeta)?.isDark;
      return getValue()
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        : <Unlink className={`h-4 w-4 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />;
    },
    size: 48,
  }),

  helper.accessor('dFlightName', {
    id:     'dFlightName',
    header: 'D-Flight Name',
    cell:   ({ getValue }) => (
      <span className="font-medium">{getValue() ?? '—'}</span>
    ),
  }),

  helper.accessor('systemName', {
    id:     'system',
    header: 'System',
    cell:   ({ getValue }) => getValue() ?? '—',
  }),

  helper.accessor('componentName', {
    id:     'component',
    header: 'Component',
    cell:   ({ getValue }) => getValue() ?? '—',
  }),

  helper.accessor('serialNumber', {
    id:     'serialNumber',
    header: 'Serial Number',
    cell:   ({ getValue, table }) => {
      const dark = (table.options.meta as ColumnMeta)?.isDark;
      const sn   = getValue();
      return sn
        ? <code className={`text-[11px] ${dark ? 'text-sky-400' : 'text-sky-600'}`}>{sn}</code>
        : <span className={dark ? 'text-slate-600' : 'text-gray-300'}>—</span>;
    },
  }),

  helper.display({
    id:     'drc',
    header: 'DRC',
    cell:   ({ row, table }) => {
      const dark = (table.options.meta as ColumnMeta)?.isDark;
      const r    = row.original;
      const id   = r.linked ? (r.storedDrc ?? r.dFlightId) : null;
      return id
        ? <code className={`text-[11px] font-semibold ${dark ? 'text-violet-400' : 'text-violet-600'}`}>{id}</code>
        : <span className={dark ? 'text-slate-600' : 'text-gray-300'}>—</span>;
    },
  }),

  helper.accessor('modelName', {
    id:     'model',
    header: 'Model',
    cell:   ({ getValue, table }) => {
      const dark = (table.options.meta as ColumnMeta)?.isDark;
      return (
        <span className={`text-[11px] ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
          {getValue() ?? '—'}
        </span>
      );
    },
  }),

  helper.accessor('status', {
    id:     'status',
    header: 'Status',
    cell:   ({ getValue, table }) => {
      const dark   = (table.options.meta as ColumnMeta)?.isDark;
      const status = getValue();
      return status
        ? (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {status}
          </span>
        )
        : <XCircle className={`h-3.5 w-3.5 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />;
    },
  }),

  helper.display({
    id:     'action',
    header: 'Action',
    cell:   ({ row, table }) => {
      const r    = row.original;
      const meta = table.options.meta as ColumnMeta;
      if (r.linked) {
        return <span className="text-[10px] font-semibold uppercase text-emerald-500">Linked</span>;
      }
      return (
        <button
          type="button"
          onClick={() => meta?.onImport?.(r)}
          className="inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        >
          <UploadCloud className="h-3 w-3" />
          Import
        </button>
      );
    },
    size: 96,
  }),
];
