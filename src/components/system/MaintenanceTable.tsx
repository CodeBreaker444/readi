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
import { useMemo, useState } from "react";
import { TablePagination } from "../tables/Pagination";
import StatusBadge, { ProgressBar } from "./StatusBadge";


function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function cleanTrigger(arr: (string | null)[] | null): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v): v is string => !!v && v !== "null");
}


function SummaryBar({ data }: { data: MaintenanceDrone[] }) {
  const counts = useMemo(() => {
    const by = (s: MaintenanceStatus) => data.filter((d) => d.status === s).length;
    return { total: data.length, ok: by("OK"), alert: by("ALERT"), due: by("DUE") };
  }, [data]);

  const stats = [
    { label: "Total Systems", value: counts.total, color: "text-slate-700" },
    { label: "OK",            value: counts.ok,    color: "text-emerald-600" },
    { label: "Alert",         value: counts.alert, color: "text-amber-600" },
    { label: "Due",           value: counts.due,   color: "text-rose-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
          <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}


type FilterStatus = "ALL" | MaintenanceStatus;

function FilterBar({
  value,
  onChange,
  search,
  onSearch,
}: {
  value: FilterStatus;
  onChange: (v: FilterStatus) => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  const options: { value: FilterStatus; label: string }[] = [
    { value: "ALL",   label: "All" },
    { value: "OK",    label: "OK" },
    { value: "ALERT", label: "Alert" },
    { value: "DUE",   label: "Due" },
  ];

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

      <div className="relative flex-1 min-w-[200px]">
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
    </div>
  );
}


function ComponentSubRow({ comp }: { comp: MaintenanceComponent }) {
  const triggers = cleanTrigger(comp.trigger);
  const daysUsed = daysSince(comp.last_maintenance);
  const model = comp.model;

  return (
    <tr className="border-t border-slate-100 bg-slate-50/60 text-sm">
      <td className="pl-10 pr-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-slate-300 flex-shrink-0" />
          <span className="text-slate-600 font-medium">{comp.component_type ?? "—"}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-slate-500 text-xs">
        {[model.factory_type, model.factory_model].filter(Boolean).join(" · ") || "—"}
      </td>
      <td className="px-3 py-2.5 text-slate-500 text-xs font-mono">
        {comp.serial_number ?? "—"}
      </td>
      <td className="px-3 py-2.5 text-slate-500 text-xs">
        {comp.last_maintenance
          ? new Date(comp.last_maintenance).toLocaleDateString("en-GB")
          : "—"}
      </td>
      <td className="px-3 py-2.5">
        <ProgressBar value={comp.total_hours} max={model.maintenance_cycle_hour}   status={comp.status} isTriggered={triggers.includes("HOUR")} />
      </td>
      <td className="px-3 py-2.5">
        <ProgressBar value={comp.total_flights} max={model.maintenance_cycle_flight} status={comp.status} isTriggered={triggers.includes("FLIGHT")} />
      </td>
      <td className="px-3 py-2.5">
        <ProgressBar value={daysUsed} max={model.maintenance_cycle_day} status={comp.status} isTriggered={triggers.includes("DAY")} />
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status={comp.status} />
      </td>
    </tr>
  );
}


const columns: ColumnDef<MaintenanceDrone>[] = [
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
    id: "type",
    header: "Type",
    cell: ({ row }) => {
      const model = row.original.model;
      return (
        <span className="text-xs text-slate-500">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
            {model.factory_type ?? "—"}
          </span>
          {model.factory_model && (
            <span className="ml-1.5 text-slate-400">{model.factory_model}</span>
          )}
        </span>
      );
    },
  },
  {
    id: "serial",
    header: "Serial",
    accessorFn: (row) => row.serial_number ?? "—",
    cell: ({ getValue }) => (
      <span className="text-xs font-mono text-slate-500">{getValue() as string}</span>
    ),
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
        <ProgressBar
          value={d.total_hours}
          max={d.model.maintenance_cycle_hour}
          status={d.status}
          isTriggered={triggers.includes("HOUR")}
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
        <ProgressBar
          value={d.total_flights}
          max={d.model.maintenance_cycle_flight}
          status={d.status}
          isTriggered={triggers.includes("FLIGHT")}
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
        <ProgressBar
          value={daysSince(d.last_maintenance)}
          max={d.model.maintenance_cycle_day}
          status={d.status}
          isTriggered={triggers.includes("DAY")}
        />
      );
    },
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];


export default function MaintenanceTable({ data }: { data: MaintenanceDrone[] }) {
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (filter !== "ALL" && d.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.code.toLowerCase().includes(q) ||
          (d.serial_number ?? "").toLowerCase().includes(q)
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
      <SummaryBar data={data} />
      <FilterBar
        value={filter}
        onChange={(v) => { setFilter(v); table.setPageIndex(0); }}
        search={search}
        onSearch={(v) => { setSearch(v); table.setPageIndex(0); }}
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