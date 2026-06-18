"use client";

import type { MaintenanceTicket } from "@/config/types/maintenance";
import { SystemCell } from "@/components/tables/SystemCell";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  startIntervention: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  endIntervention: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v4H9z" />
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
  onIntervention?: (id: number, action: 'start' | 'end') => void;
  canClose?: boolean;
  canAssign?: boolean;
  canDownload?: boolean;
  canIntervene?: boolean;
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
  onIntervention,
  canClose = false,
  canAssign = false,
  canDownload = false,
  canIntervene = false,
  isDark,
}: Props) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8,
  });

  const columns: ColumnDef<MaintenanceTicket>[] = useMemo(
    () => [
      {
        id: "ticket",
        header: t('systems.maintenanceLogbook.table.ticket'),
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
        header: t('systems.maintenanceLogbook.table.system'),
        cell: ({ row }) => (
          <SystemCell code={row.original.drone_code} name={row.original.drone_model} size="sm" />
        ),
      },
      {
        id: "component",
        header: t('systems.maintenanceLogbook.table.component'),
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
        header: t('systems.maintenanceLogbook.table.description'),
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
        id: "location",
        header: t('systems.maintenanceLogbook.table.location'),
        cell: ({ row }) => {
          const lat = row.original.location_latitude;
          const lon = row.original.location_longitude;
          if (lat === null || lat === undefined || lon === null || lon === undefined) {
            return <span className={`text-xs ${isDark ? "text-slate-600" : "text-slate-300"}`}>—</span>;
          }
          return (
            <span className={`text-[11px] font-mono tabular-nums whitespace-nowrap ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              {Number(lat).toFixed(5)} / {Number(lon).toFixed(5)}
            </span>
          );
        },
      },
      {
        id: "assigned",
        header: t('systems.maintenanceLogbook.table.assignedTo'),
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div>
              <p
                className={`text-xs font-medium leading-tight ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {ticket.assigner_name || t('systems.maintenanceLogbook.table.unassigned')}
              </p>
              {ticket.assigner_email && (
                <p
                  className={`text-[11px] truncate max-w-[160px] ${
                    isDark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {ticket.assigner_email}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: t('systems.maintenanceLogbook.table.status'),
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
        header: t('systems.maintenanceLogbook.table.priority'),
        cell: ({ row }) => (
          <Badge
            label={row.original.ticket_priority}
            style={PRIORITY_STYLES[row.original.ticket_priority]}
          />
        ),
      },
      {
        id: "opened",
        header: t('systems.maintenanceLogbook.table.opened'),
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
        header: t('systems.maintenanceLogbook.table.closed'),
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
        header: t('systems.maintenanceLogbook.table.actions'),
        cell: ({ row }) => {
          const ticket = row.original;
          const isOpen = ticket.ticket_status === "OPEN";
          const isActive = ticket.ticket_status !== "CLOSED";

          return (
            <div className="flex items-center gap-0.5">
              <ActionIcon label={t('systems.maintenanceLogbook.actions.events')} onClick={() => onEvents(ticket.ticket_id)}>
                {Icons.events}
              </ActionIcon>

              {isOpen && canAssign && (
                <ActionIcon
                  label={t('systems.maintenanceLogbook.actions.assign')}
                  onClick={() => onAssign(ticket.ticket_id)}
                >
                  {Icons.assign}
                </ActionIcon>
              )}

              {isActive && (
                <>
                  <ActionIcon
                    label={t('systems.maintenanceLogbook.actions.report')}
                    onClick={() => onReport(ticket.ticket_id)}
                  >
                    {Icons.report}
                  </ActionIcon>
                  <ActionIcon
                    label={t('systems.maintenanceLogbook.actions.upload')}
                    onClick={() => onUpload(ticket.ticket_id)}
                  >
                    {Icons.upload}
                  </ActionIcon>
                </>
              )}

              {isActive && canIntervene && onIntervention && !ticket.intervention_started_at && (
                <ActionIcon
                  label="Start"
                  onClick={() => onIntervention(ticket.ticket_id, 'start')}
                  variant="success"
                >
                  {Icons.startIntervention}
                </ActionIcon>
              )}

              {isActive && canIntervene && onIntervention && ticket.intervention_started_at && !ticket.intervention_ended_at && (
                <ActionIcon
                  label="End"
                  onClick={() => onIntervention(ticket.ticket_id, 'end')}
                  variant="danger"
                >
                  {Icons.endIntervention}
                </ActionIcon>
              )}

              {onDownload && canDownload && (
                <ActionIcon
                  label={t('systems.maintenanceLogbook.actions.downloadFiles')}
                  onClick={() => onDownload(ticket.ticket_id)}
                  variant="download"
                >
                  {Icons.download}
                </ActionIcon>
              )}

              {isOpen && canClose && (
                <ActionIcon
                  label={t('systems.maintenanceLogbook.actions.closeTicket')}
                  onClick={() => onClose(ticket.ticket_id)}
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
    [isDark, onEvents, onAssign, onReport, onUpload, onClose, onDownload, onIntervention, canClose, canAssign, canDownload, canIntervene, t]
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
          filename={t('systems.maintenanceLogbook.exportFilename')}
          headers={[
            t('systems.maintenanceLogbook.exportHeaders.ticketId'),
            t('systems.maintenanceLogbook.exportHeaders.type'),
            t('systems.maintenanceLogbook.exportHeaders.system'),
            t('systems.maintenanceLogbook.exportHeaders.latitude'),
            t('systems.maintenanceLogbook.exportHeaders.longitude'),
            t('systems.maintenanceLogbook.exportHeaders.component'),
            t('systems.maintenanceLogbook.exportHeaders.componentSN'),
            t('systems.maintenanceLogbook.exportHeaders.description'),
            t('systems.maintenanceLogbook.exportHeaders.assignedTo'),
            t('systems.maintenanceLogbook.exportHeaders.email'),
            t('systems.maintenanceLogbook.exportHeaders.status'),
            t('systems.maintenanceLogbook.exportHeaders.priority'),
            t('systems.maintenanceLogbook.exportHeaders.opened'),
            t('systems.maintenanceLogbook.exportHeaders.closed'),
          ]}
          rows={tickets.map(t => [t.ticket_id, t.ticket_type, t.drone_code ?? '', t.location_latitude ?? '', t.location_longitude ?? '', t.entity_name ?? '', t.component_sn ?? '', t.note ?? '', t.assigner_name ?? '', t.assigner_email ?? '', t.ticket_status, t.ticket_priority, t.opened_at, t.closed_at ?? ''])}
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
  const { t } = useTranslation();
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
        <p className="text-sm">{t('systems.maintenanceLogbook.table.noTickets')}</p>
      </td>
    </tr>
  );
}