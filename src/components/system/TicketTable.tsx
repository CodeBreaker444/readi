"use client";

import type { MaintenanceTicket } from "@/config/types/maintenance";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { TablePagination } from "../tables/Pagination";
import ExportButtons from "./ExportButtons";
import { Badge, PRIORITY_STYLES, STATUS_STYLES, fmtDate } from "./TicketUi";

function ActionIcon({
  children,
  label,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "success" | "danger" | "download";
}) {
  const styles = {
    default:
      "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700",
    success:
      "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30",
    danger:
      "text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/30",
    download:
      "text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30",
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      className={`cursor-pointer inline-flex items-center gap-1 px-2 h-7 rounded-lg transition-all text-xs font-medium ${styles[variant]}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

const Icons = {
  events: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  assign: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  report: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  upload: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  close: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

interface Props {
  tickets: MaintenanceTicket[];
  loading: boolean;
  onEvents: (id: number) => void;
  onAssign: (id: number) => void;
  onReport: (id: number) => void;
  onUpload: (id: number) => void;
  onClose: (id: number) => void;
  onDownload?: (id: number) => void;
  canClose?: boolean;
  isDark: boolean;
}

export function TicketTable({
  tickets,
  loading,
  onEvents,
  onAssign,
  onReport,
  onUpload,
  onClose,
  onDownload,
  canClose = false,
  isDark,
}: Props) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8,
  });

  const columns: ColumnDef<MaintenanceTicket>[] = useMemo(
    () => [
      {
        id: "ticket",
        header: "Ticket",
        accessorFn: (row) => row.ticket_id,
        cell: ({ row }) => {
          const t = row.original;
          const isOpen = t.ticket_status === "OPEN";
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={`w-1 h-8 rounded-full shrink-0 ${
                  isOpen ? "bg-rose-400" : "bg-emerald-400"
                }`}
              />
              <div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    isDark ? "text-white" : "text-slate-800"
                  }`}
                >
                  #{t.ticket_id}
                </p>
                <p
                  className={`text-[11px] ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {t.ticket_type}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "drone",
        header: "System",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <p
                className={`text-sm font-semibold ${
                  isDark ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                {t.drone_code ?? "—"}
              </p>
              <p
                className={`text-[11px] truncate max-w-[140px] ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {t.drone_model ?? "—"}
              </p>
            </div>
          );
        },
      },
      {
        id: "component",
        header: "Component",
        cell: ({ row }) => {
          const t = row.original;

          if (t.entity_name || t.component_sn) {
            return (
              <div>
                {t.entity_name && (
                  <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    {t.entity_name}
                  </p>
                )}
                {t.component_sn && (
                  <p className={`text-[11px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {t.component_sn}
                  </p>
                )}
              </div>
            );
          }

          if (t.system_components && t.system_components.length > 0) {
            return (
              <div className="space-y-0.5">
                {t.system_components.map((c, i) => (
                  <div key={i}>
                    <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      {c.component_type}
                    </p>
                    {c.component_sn && (
                      <p className={`text-[11px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {c.component_sn}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          }

          return (
            <span className={`text-xs ${isDark ? "text-slate-600" : "text-slate-300"}`}>—</span>
          );
        },
      },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => {
          const note = row.original.note;
          return note ? (
            <span className={`text-xs line-clamp-2 max-w-[200px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {note}
            </span>
          ) : (
            <span className={`text-xs ${isDark ? "text-slate-600" : "text-slate-300"}`}>—</span>
          );
        },
      },
      {
        id: "serial",
        header: "Serial",
        cell: ({ row }) => (
          <span
            className={`text-xs font-mono ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {row.original.drone_serial ?? "—"}
          </span>
        ),
      },
      {
        id: "assigned",
        header: "Assigned To",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <p
                className={`text-xs font-medium leading-tight ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {t.assigner_name || "Unassigned"}
              </p>
              {t.assigner_email && (
                <p
                  className={`text-[11px] truncate max-w-[160px] ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {t.assigner_email}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.ticket_status,
        cell: ({ row }) => (
          <Badge
            label={row.original.ticket_status}
            style={
              STATUS_STYLES[row.original.ticket_status] ?? STATUS_STYLES.OPEN
            }
          />
        ),
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <Badge
            label={row.original.ticket_priority}
            style={PRIORITY_STYLES[row.original.ticket_priority]}
          />
        ),
      },
      {
        id: "opened",
        header: "Opened",
        accessorFn: (row) => row.opened_at,
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          return (
            <span
              className={`text-xs whitespace-nowrap ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {val ? fmtDate(val) : "—"}
            </span>
          );
        },
      },
      {
        id: "closed",
        header: "Closed",
        accessorFn: (row) => row.closed_at,
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          return (
            <span
              className={`text-xs whitespace-nowrap ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {val ? fmtDate(val) : <span className={isDark ? "text-slate-600" : "text-slate-300"}>—</span>}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const t = row.original;
          const isOpen = t.ticket_status === "OPEN";

          return (
            <div className="flex items-center gap-0.5">
              <ActionIcon label="Events" onClick={() => onEvents(t.ticket_id)}>
                {Icons.events}
              </ActionIcon>

              {isOpen && (
                <>
                  <ActionIcon
                    label="Assign"
                    onClick={() => onAssign(t.ticket_id)}
                  >
                    {Icons.assign}
                  </ActionIcon>
                  <ActionIcon
                    label="Report"
                    onClick={() => onReport(t.ticket_id)}
                  >
                    {Icons.report}
                  </ActionIcon>
                  <ActionIcon
                    label="Upload"
                    onClick={() => onUpload(t.ticket_id)}
                  >
                    {Icons.upload}
                  </ActionIcon>
                </>
              )}

              {onDownload && (
                <ActionIcon
                  label="Download Files"
                  onClick={() => onDownload(t.ticket_id)}
                  variant="download"
                >
                  {Icons.download}
                </ActionIcon>
              )}

              {isOpen && canClose && (
                <ActionIcon
                  label="Close Ticket"
                  onClick={() => onClose(t.ticket_id)}
                  variant="success"
                >
                  {Icons.close}
                </ActionIcon>
              )}
            </div>
          );
        },
      },
    ],
    [isDark, onEvents, onAssign, onReport, onUpload, onClose, onDownload, canClose]
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const thCls = `text-left text-xs font-semibold uppercase tracking-wide px-3 py-2.5 whitespace-nowrap ${
    isDark ? "text-slate-500" : "text-slate-500"
  }`;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className={`border-b ${
                isDark
                  ? "bg-slate-800 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {table.getFlatHeaders().map((header) => (
                <th key={header.id} className={thCls}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={columns.length} isDark={isDark} />
            ) : table.getRowModel().rows.length === 0 ? (
              <EmptyRow cols={columns.length} isDark={isDark} />
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t transition-colors ${
                    isDark
                      ? "border-slate-700 hover:bg-slate-700/40"
                      : "border-slate-100 hover:bg-slate-50/80"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={`border-t px-2 flex items-center justify-between ${isDark ? "border-slate-700" : "border-slate-200"}`}>
        <ExportButtons
          filename="Maintenance Tickets"
          headers={['Ticket ID', 'Type', 'System', 'Serial', 'Component', 'Component SN', 'Description', 'Assigned To', 'Email', 'Status', 'Priority', 'Opened', 'Closed']}
          rows={tickets.map(t => [t.ticket_id, t.ticket_type, t.drone_code ?? '', t.drone_serial ?? '', t.entity_name ?? '', t.component_sn ?? '', t.note ?? '', t.assigner_name ?? '', t.assigner_email ?? '', t.ticket_status, t.ticket_priority, t.opened_at, t.closed_at ?? ''])}
        />
        <TablePagination table={table} />
      </div>
    </div>
  );
}

function SkeletonRows({ cols, isDark }: { cols: number; isDark: boolean }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-3 py-3">
              <div
                className={`h-4 rounded w-20 ${
                  isDark ? "bg-slate-700" : "bg-slate-200"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyRow({ cols, isDark }: { cols: number; isDark: boolean }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className={`text-center py-16 ${
          isDark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        <svg
          className={`w-10 h-10 mx-auto mb-3 ${
            isDark ? "text-slate-600" : "text-slate-300"
          }`}
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
        <p className="text-sm">No tickets found</p>
      </td>
    </tr>
  );
}