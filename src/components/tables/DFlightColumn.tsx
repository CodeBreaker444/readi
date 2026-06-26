import type { FleetRow } from '@/types/dflight';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle2, Unlink, XCircle } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:           'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  UNDERMAINTENANCE: 'bg-amber-500/10  text-amber-500  border-amber-500/30',
  DELETED:          'bg-red-500/10    text-red-500    border-red-500/30',
};

const helper = createColumnHelper<FleetRow>();

export type ColumnMeta = { isDark: boolean };

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

  helper.accessor('systemName', {
    id:     'system',
    header: 'System',
    cell:   ({ getValue }) => (
      <span className="font-medium">{getValue()}</span>
    ),
  }),

  helper.accessor('componentName', {
    id:     'component',
    header: 'Component',
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

  helper.accessor('dFlightId', {
    id:     'drc',
    header: 'DRC',
    cell:   ({ getValue, table }) => {
      const dark = (table.options.meta as ColumnMeta)?.isDark;
      const id   = getValue();
      return id
        ? <code className={`text-[11px] font-semibold ${dark ? 'text-violet-400' : 'text-violet-600'}`}>{id}</code>
        : <span className={dark ? 'text-slate-600' : 'text-gray-300'}>—</span>;
    },
  }),

  helper.accessor('dFlightDroneName', {
    id:     'dFlightName',
    header: 'D-Flight Name',
    cell:   ({ getValue }) => getValue() ?? '—',
  }),

  helper.accessor('dFlightModel', {
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

  helper.accessor('dFlightStatus', {
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
];