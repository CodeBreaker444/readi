import { MaintenanceTicket } from '@/config/types/maintenance';
import { ActionBtn, Badge, fmtDate, PRIORITY_STYLES, STATUS_STYLES } from './TicketUi';

const COLUMNS = [
  'ID', 'Type', 'Tool Code', 'Serial', 'Model',
  'Assigned To', 'Status', 'Priority', 'Opened', 'Closed', 'Actions',
];

interface Props {
  tickets: MaintenanceTicket[];
  loading: boolean;
  onEvents: (id: number) => void;
  onAssign: (id: number) => void;
  onReport: (id: number) => void;
  onUpload: (id: number) => void;
  onClose: (id: number) => void;
  isDark: boolean;
}

import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { TablePagination } from '../tables/Pagination';

export function TicketTable({
  tickets,
  loading,
  onEvents,
  onAssign,
  onReport,
  onUpload,
  onClose,
  isDark
}: Props) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8,
  });

  const table = useReactTable({
    data: tickets,
    columns: [],  
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-gray-50 text-gray-900 border-slate-200'} rounded-2xl border shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-slate-50 border-b border-slate-200'}`}>
                {COLUMNS.map((h) => (
                  <th
                    key={h}
                    className={`text-left text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-500'} uppercase tracking-wide px-4 py-3 whitespace-nowrap`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {loading ? (
                <SkeletonRows />
              ) : table.getRowModel().rows.length === 0 ? (
                <EmptyRow />
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TicketRow
                    key={row.original.ticket_id}
                    ticket={row.original}
                    onEvents={onEvents}
                    onAssign={onAssign}
                    onReport={onReport}
                    onUpload={onUpload}
                    onClose={onClose}
                    isDark={isDark}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-auto">
        <TablePagination table={table} />
      </div>
    </div>
  );
}


function TicketRow({
  ticket: t,
  onEvents,
  onAssign,
  onReport,
  onUpload,
  onClose,
  isDark
}: {
  ticket: MaintenanceTicket;
  onEvents: (id: number) => void;
  onAssign: (id: number) => void;
  onReport: (id: number) => void;
  onUpload: (id: number) => void;
  onClose: (id: number) => void;
  isDark:boolean
}) {
  const borderColor =
    t.ticket_status === 'OPEN' ? 'border-l-rose-400' : 'border-l-emerald-400';

  return (
    <tr className={`${isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-50'} transition-colors border-l-2 ${borderColor}`}>
      <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-white' : 'text-slate-500'}`}>#{t.ticket_id}</td>
      <td className={`px-4 py-3 ${isDark ? 'text-white' : 'text-slate-700'}`}>{t.ticket_type}</td>
      <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-indigo-600'}`}>{t.drone_code ?? '—'}</td>
      <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-white' : 'text-slate-600'}`}>{t.drone_serial ?? '—'}</td>
      <td className={`px-4 py-3 ${isDark ? 'text-white' : 'text-slate-600'} max-w-[160px] truncate`}   >{t.drone_model ?? '—'}</td>
      <td className="px-4 py-3">
        <div className={`${isDark ? 'text-white' : 'text-slate-700'} font-medium leading-tight`}>{t.assigner_name}</div>
        <div className={`text-xs ${isDark ? 'text-white' : 'text-slate-700'}`}>{t.assigner_email}</div>
      </td>
      <td className="px-4 py-3">
        <Badge
          label={t.ticket_status}
          style={STATUS_STYLES[t.ticket_status] ?? STATUS_STYLES.OPEN}
        />
      </td>
      <td className="px-4 py-3">
        <Badge label={t.ticket_priority} style={PRIORITY_STYLES[t.ticket_priority]} />
      </td>
      <td className={`px-4 py-3 text-xs ${isDark ? 'text-white' : 'text-slate-700'} whitespace-nowrap`}>
        {fmtDate(t.opened_at)}
      </td>
      <td className={`px-4 py-3 text-xs ${isDark ? 'text-white' : 'text-slate-700'} whitespace-nowrap`}>
        {fmtDate(t.closed_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          <ActionBtn color="blue" onClick={() => onEvents(t.ticket_id)}>Events</ActionBtn>
          <ActionBtn color="violet" onClick={() => onAssign(t.ticket_id)}>Assign</ActionBtn>
          <ActionBtn color="teal" onClick={() => onReport(t.ticket_id)}>Report</ActionBtn>
          <ActionBtn color="slate" onClick={() => onUpload(t.ticket_id)}>Upload</ActionBtn>
          {t.ticket_status === 'OPEN' && (
            <ActionBtn color="emerald" onClick={() => onClose(t.ticket_id)}>Close</ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
}


function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 11 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-slate-200 rounded w-20" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}


function EmptyRow() {
  return (
    <tr>
      <td colSpan={11} className="text-center py-16 text-slate-400">
        <svg
          className="w-10 h-10 mx-auto mb-3 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        No tickets found
      </td>
    </tr>
  );
}