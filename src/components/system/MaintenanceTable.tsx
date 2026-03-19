"use client";

import type {
  MaintenanceComponent,
  MaintenanceDrone,
  MaintenanceStatus,
} from "@/config/types/maintenance";
import {
  ColumnDef,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { TablePagination } from "../tables/Pagination";
import StatusBadge from "./StatusBadge";

const MIN_THRESHOLD = 50;
const MAX_THRESHOLD = 99;


function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function cleanTrigger(arr: (string | null)[] | null): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v): v is string => !!v && v !== "null");
}

function UsageLimitCell({
  current,
  limit,
  unit,
  status,
  isTriggered,
  threshold,
}: {
  current: number | null;
  limit: number | null;
  unit: string;
  status: MaintenanceStatus;
  isTriggered: boolean;
  threshold: number;
}) {
  const cur = current ?? 0;
  const max = limit && limit > 0 ? limit : null;
  const pct = max ? Math.min((cur / max) * 100, 100) : 0;

  const barColor =
    status === "DUE" && isTriggered
      ? "bg-rose-500"
      : status === "ALERT" && isTriggered
      ? "bg-amber-500"
      : "bg-emerald-500";

  const textColor =
    status === "DUE" && isTriggered
      ? "text-rose-600"
      : status === "ALERT" && isTriggered
      ? "text-amber-600"
      : "text-slate-600";

  if (!max) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">—</span>
      </div>
    );
  }

  const thresholdPct = Math.min(100, Math.max(0, threshold));

  return (
    <div className="flex flex-col gap-1 min-w-25">
      <div className="flex items-baseline justify-between gap-1">
        <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
          {cur}
        </span>
        <span className="text-[10px] text-slate-400">
          / {max} {unit}
        </span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-slate-100 overflow-visible">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-sm bg-amber-400 opacity-80"
          style={{ left: `${thresholdPct}%` }}
          title={`Alert threshold: ${threshold}%`}
        />
      </div>
      <span className="text-[9px] text-slate-400 tabular-nums">{pct.toFixed(0)}%</span>
    </div>
  );
}

function CycleBadge({ model }: { model: MaintenanceComponent["model"] }) {
  const parts: string[] = [];
  if (model.maintenance_cycle_hour > 0) parts.push(`${model.maintenance_cycle_hour}h`);
  if (model.maintenance_cycle_flight > 0) parts.push(`${model.maintenance_cycle_flight}fl`);
  if (model.maintenance_cycle_day > 0) parts.push(`${model.maintenance_cycle_day}d`);

  if (parts.length === 0) return <span className="text-xs text-slate-300">—</span>;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 font-medium">
      {parts.join(" · ")}
    </span>
  );
}


function effectiveStatus(drone: MaintenanceDrone): MaintenanceStatus {
  const all: MaintenanceStatus[] = [drone.status, ...drone.components.map((c) => c.status)];
  if (all.includes("DUE")) return "DUE";
  if (all.includes("ALERT")) return "ALERT";
  return "OK";
}

export function SummaryBar({ data, threshold }: { data: MaintenanceDrone[]; threshold: number }) {
  const counts = useMemo(() => {
    let ok = 0, alert = 0, due = 0;
    for (const d of data) {
      const all: MaintenanceStatus[] = [d.status, ...d.components.map((c) => c.status)];
      const hasDue = all.includes("DUE");
      const hasAlert = all.includes("ALERT");
      if (!hasDue && !hasAlert) { ok++; continue; }
      if (hasDue) due++;
      if (hasAlert) alert++;
    }
    return { total: data.length, ok, alert, due };
  }, [data]);

  const thresholdLabel = threshold < 70 ? "Sensitive" : threshold < 85 ? "Normal" : "Lenient";
  const thresholdColor = threshold < 70 ? "text-emerald-600" : threshold < 85 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
      <div className="bg-white rounded-xl border-2 border-violet-200 px-4 py-3 flex flex-col gap-1">
        <p className="text-xs text-slate-500">Alert Threshold</p>
        <div className="flex items-baseline gap-1.5">
          <p className={`text-2xl font-bold tabular-nums ${thresholdColor}`}>{threshold}%</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
            threshold < 70
              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : threshold < 85
              ? "text-amber-600 bg-amber-50 border-amber-200"
              : "text-rose-600 bg-rose-50 border-rose-200"
          }`}>{thresholdLabel}</span>
        </div>
        <div className="relative h-1 w-full rounded-full bg-slate-100 mt-1">
          <div className="h-full rounded-full bg-violet-400" style={{ width: `${threshold}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-500 mb-0.5">Total Systems</p>
        <p className="text-2xl font-bold tabular-nums text-slate-700">{counts.total}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-500 mb-0.5">OK</p>
        <p className="text-2xl font-bold tabular-nums text-emerald-600">{counts.ok}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-500 mb-0.5">Alert</p>
        <p className="text-2xl font-bold tabular-nums text-amber-600">{counts.alert}</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-500 mb-0.5">Due</p>
        <p className="text-2xl font-bold tabular-nums text-rose-600">{counts.due}</p>
      </div>
    </div>
  );
}


type FilterStatus = "ALL" | MaintenanceStatus;

function FilterBar({
  value,
  onChange,
  search,
  onSearch,
  threshold,
  onApplyThreshold,
}: {
  value: FilterStatus;
  onChange: (v: FilterStatus) => void;
  search: string;
  onSearch: (v: string) => void;
  threshold: number;
  onApplyThreshold: (v: number) => void;
}) {
  const [localInput, setLocalInput] = useState(String(threshold));

  const options: { value: FilterStatus; label: string }[] = [
    { value: "ALL",   label: "All" },
    { value: "OK",    label: "OK" },
    { value: "ALERT", label: "Alert" },
    { value: "DUE",   label: "Due" },
  ];

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, parsed));
      setLocalInput(String(clamped));
      onApplyThreshold(clamped);
    } else {
      setLocalInput(String(threshold));
    }
  };

  const thresholdColor =
    threshold >= 90
      ? "text-rose-600 bg-rose-50 border-rose-200"
      : threshold >= 70
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-emerald-600 bg-emerald-50 border-emerald-200";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              value === opt.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-50">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by code or serial…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-500">Alert threshold</span>
        </div>

        <input
          type="range"
          min={MIN_THRESHOLD}
          max={MAX_THRESHOLD}
          step={1}
          value={threshold}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setLocalInput(String(v));
            onApplyThreshold(v);
          }}
          className="w-28 accent-violet-600 cursor-pointer"
        />

        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min={MIN_THRESHOLD}
            max={MAX_THRESHOLD}
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(localInput); }}
            className="w-12 text-center text-xs font-semibold rounded-md border border-slate-300 bg-white px-1 py-1 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <span className="text-xs font-medium text-slate-500">%</span>
        </div>

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${thresholdColor}`}>
          {threshold < 70 ? "Sensitive" : threshold < 85 ? "Normal" : "Lenient"}
        </span>
      </div>
    </div>
  );
}


function ComponentSubRow({ comp, threshold }: { comp: MaintenanceComponent; threshold: number }) {
  const triggers = cleanTrigger(comp.trigger);
  const model = comp.model;

  return (
    <tr className="border-t border-slate-100 bg-slate-50/60 text-sm">
      <td className="pl-10 pr-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-slate-300 shrink-0" />
          <div>
            <span className="text-slate-600 font-medium">{comp.component_name ?? "—"}</span>
            {comp.component_type && (
              <p className="text-[11px] text-slate-400">{comp.component_type}</p>
            )}
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 text-slate-500 text-xs font-mono">
        {comp.serial_number ?? "—"}
      </td>

      <td className="px-3 py-2.5">
        <CycleBadge model={model} />
      </td>

      <td className="px-3 py-2.5 text-slate-500 text-xs">
        {comp.last_maintenance
          ? new Date(comp.last_maintenance).toLocaleDateString("en-GB")
          : "—"}
      </td>

      <td className="px-3 py-2.5">
        <UsageLimitCell
          current={comp.total_hours}
          limit={model.maintenance_cycle_hour}
          unit="h"
          status={comp.status}
          isTriggered={triggers.includes("HOUR")}
          threshold={threshold}
        />
      </td>

      <td className="px-3 py-2.5">
        <UsageLimitCell
          current={comp.total_flights}
          limit={model.maintenance_cycle_flight}
          unit="fl"
          status={comp.status}
          isTriggered={triggers.includes("FLIGHT")}
          threshold={threshold}
        />
      </td>

      <td className="px-3 py-2.5">
        <UsageLimitCell
          current={comp.total_days}
          limit={model.maintenance_cycle_day}
          unit="d"
          status={comp.status}
          isTriggered={triggers.includes("DAY")}
          threshold={threshold}
        />
      </td>

      <td className="px-3 py-2.5">
        <StatusBadge status={comp.status} />
      </td>
    </tr>
  );
}


function buildColumns(threshold: number): ColumnDef<MaintenanceDrone>[] {
  return [
    {
      id: "drone",
      header: "Drone / Component",
      accessorFn: (row) => row.code,
      cell: ({ row }) => {
        const drone = row.original;
        const hasComponents = drone.components.length > 0;
        return (
          <div className="flex items-center gap-2">
            {hasComponents ? (
              <button
                onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                className="text-slate-400 transition-transform duration-200 focus:outline-none"
                style={{ transform: row.getIsExpanded() ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <span className="w-3.5 h-3.5 inline-block" />
            )}
            <div>
              <p className="font-semibold text-slate-800 text-sm">{drone.code}</p>
              {hasComponents && (
                <p className="text-[11px] text-slate-400">
                  {drone.components.length} component{drone.components.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "serial",
      header: "Serial",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-slate-500">
          {row.original.serial_number || "—"}
        </span>
      ),
    },
    {
      id: "cycle",
      header: "Maint. Cycle",
      cell: ({ row }) => <CycleBadge model={row.original.model} />,
    },
    {
      id: "last_maintenance",
      header: "Last Maintenance",
      accessorFn: (row) => row.last_maintenance,
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        return (
          <span className="text-xs text-slate-500">
            {val ? new Date(val).toLocaleDateString("en-GB") : <span className="text-slate-300">—</span>}
          </span>
        );
      },
    },
    {
      id: "hours",
      header: "Hours",
      cell: ({ row }) => {
        const d = row.original;
        const triggers = cleanTrigger(d.trigger);
        return (
          <UsageLimitCell
            current={d.total_hours}
            limit={d.model.maintenance_cycle_hour}
            unit="h"
            status={d.status}
            isTriggered={triggers.includes("HOUR")}
            threshold={threshold}
          />
        );
      },
    },
    {
      id: "flights",
      header: "Flights",
      cell: ({ row }) => {
        const d = row.original;
        const triggers = cleanTrigger(d.trigger);
        return (
          <UsageLimitCell
            current={d.total_flights}
            limit={d.model.maintenance_cycle_flight}
            unit="fl"
            status={d.status}
            isTriggered={triggers.includes("FLIGHT")}
            threshold={threshold}
          />
        );
      },
    },
    {
      id: "days",
      header: "Days",
      cell: ({ row }) => {
        const d = row.original;
        const triggers = cleanTrigger(d.trigger);
        return (
          <UsageLimitCell
            current={daysSince(d.last_maintenance)}
            limit={d.model.maintenance_cycle_day}
            unit="d"
            status={d.status}
            isTriggered={triggers.includes("DAY")}
            threshold={threshold}
          />
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status,
      cell: ({ row }) => {
        const drone = row.original;
        if (drone.components.length === 0) {
          return <StatusBadge status={drone.status} />;
        }
        const compCounts = { DUE: 0, ALERT: 0, OK: 0 };
        for (const c of drone.components) compCounts[c.status] = (compCounts[c.status] ?? 0) + 1;
        const eff = effectiveStatus(drone);
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge status={eff} />
            <div className="flex flex-wrap gap-1">
              {compCounts.DUE > 0 && (
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 leading-none">
                  {compCounts.DUE} DUE
                </span>
              )}
              {compCounts.ALERT > 0 && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 leading-none">
                  {compCounts.ALERT} ALERT
                </span>
              )}
              {compCounts.OK > 0 && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 leading-none">
                  {compCounts.OK} OK
                </span>
              )}
            </div>
          </div>
        );
      },
    },
  ];
}


export default function MaintenanceTable({
  data,
  threshold = 80,
  onApplyThreshold,
}: {
  data: MaintenanceDrone[];
  threshold?: number;
  onApplyThreshold?: (v: number) => void;
}) {
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo(() => buildColumns(threshold), [threshold]);

  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (filter !== "ALL" && effectiveStatus(d) !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.code.toLowerCase().includes(q) ||
          (d.serial_number && d.serial_number.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [data, filter, search]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) => row.original.components.length > 0,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  return (
    <div>
      <FilterBar
        value={filter}
        onChange={(v) => { setFilter(v); table.setPageIndex(0); }}
        search={search}
        onSearch={(v) => { setSearch(v); table.setPageIndex(0); }}
        threshold={threshold}
        onApplyThreshold={onApplyThreshold ?? (() => {})}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {table.getFlatHeaders().map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center text-slate-400 text-sm">
                    No results found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <>
                    <tr
                      key={row.id}
                      className={`border-t border-slate-200 transition-colors ${
                        row.getCanExpand()
                          ? "cursor-pointer hover:bg-blue-50/40"
                          : "hover:bg-slate-50/80"
                      } ${row.getIsExpanded() ? "bg-blue-50/30" : ""}`}
                      onClick={() => row.getCanExpand() && row.toggleExpanded()}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>

                    {row.getIsExpanded() &&
                      row.original.components.map((comp) => (
                        <ComponentSubRow
                          key={comp.tool_component_id}
                          comp={comp}
                          threshold={threshold}
                        />
                      ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-2">
          <TablePagination table={table} />
        </div>
      </div>
    </div>
  );
}
