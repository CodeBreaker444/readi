"use client";

import { Badge } from "@/components/ui/badge";
 
import { cn } from "@/lib/utils";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock,
    Plane,
    Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../ui/skeleton";


interface ComponentInfo {
  component_id: number;
  component_type: string | null;
  component_code: string | null;
  serial_number: string | null;
  current_hours: number;
  current_flights: number;
  current_days: number;
  limit_hour: number;
  limit_flight: number;
  limit_day: number;
  maintenance_cycle_type: string;
  last_maintenance_date: string | null;
  status: "OK" | "ALERT" | "DUE";
  trigger: string[];
}

interface SystemData {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  system_status: "OK" | "ALERT" | "DUE";
  components: ComponentInfo[];
}

interface ComponentInput {
  component_id: number;
  add_flights: number;
  add_hours: number;
}

const STATUS_CONFIG = {
  OK: {
    label: "OK",
    dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    light: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    barColor: "bg-emerald-500",
  },
  ALERT: {
    label: "Alert",
    dark: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    light: "bg-amber-50 text-amber-600 border-amber-200",
    dot: "bg-amber-500",
    barColor: "bg-amber-400",
  },
  DUE: {
    label: "Due",
    dark: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    light: "bg-rose-50 text-rose-600 border-rose-200",
    dot: "bg-rose-500",
    barColor: "bg-rose-500",
  },
};


function hhmmToMinutes(hhmm: number): number {
  const h = Math.floor(hhmm);
  const m = Math.round((hhmm - h) * 100);
  return h * 60 + m;
}

function addHhmmHours(a: number, b: number): number {
  const totalMin = hhmmToMinutes(a) + hhmmToMinutes(b);
  return Math.floor(totalMin / 60) + (totalMin % 60) / 100;
}

 

function formatHhmmHours(value: number): string {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 100);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function CycleProgressBar({
  current,
  limit,
  label,
  icon: Icon,
  status,
  isDark,
  isHours,
}: {
  current: number;
  limit: number;
  label: string;
  icon: React.ElementType;
  status: "OK" | "ALERT" | "DUE";
  isDark: boolean;
  isHours?: boolean;
}) {
  if (!limit || limit <= 0) return null;
  const pct = Math.min(100, (current / limit) * 100);
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3", isDark ? "text-slate-500" : "text-slate-400")} />
        <span className={cn("text-[10px] uppercase tracking-wider font-medium", isDark ? "text-slate-500" : "text-slate-400")}>
          {label}
        </span>
      </div>
      <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isDark ? "bg-slate-700" : "bg-slate-100")}>
        <div className={cn("h-full rounded-full transition-all", cfg.barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className={cn("text-xs tabular-nums", isDark ? "text-slate-400" : "text-slate-500")}>
        {isHours ? formatHhmmHours(current) : current}
        <span className={isDark ? "text-slate-600" : "text-slate-400"}> / {isHours ? formatHhmmHours(limit) : limit}</span>
      </p>
    </div>
  );
}

function formatLastMaintenance(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return d.toLocaleDateString();
}
 

interface MaintenanceTabProps {
  loadingMaint: boolean;
  systemData: SystemData | null;
  inputs: Record<number, ComponentInput>;
  hoursRaw: Record<number, string>;
  autoSyncedIds: Set<number>;
  isDark: boolean;
  onToggleFlight: (compId: number) => void;
  onHoursChange: (compId: number, value: string) => void;
  onResetHours: (compId: number) => void;
}

export function MaintenanceTab({
  loadingMaint,
  systemData,
  inputs,
  hoursRaw,
  autoSyncedIds,
  isDark,
  onToggleFlight,
  onHoursChange,
  onResetHours,
}: MaintenanceTabProps) {
  const { t } = useTranslation();
  const hasComponents = systemData && systemData.components.length > 0;

  if (loadingMaint) {
    return (
      <div className={cn("rounded-xl border p-4 space-y-4", isDark ? "border-white/[0.06] bg-slate-900/40" : "border-slate-200 bg-white")}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!hasComponents) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className={cn("mx-auto mb-3 h-8 w-8", isDark ? "text-slate-600" : "text-slate-300")} />
        <p className={cn("text-sm", isDark ? "text-slate-500" : "text-slate-400")}>
          {t("operations.missionComplete.maintenance.noComponents")}
        </p>
      </div>
    );
  }

  return (
    <>
      {systemData && (
        <div className="mb-3">
          <Badge
            variant="outline"
            className={cn("text-[10px] font-medium px-2 py-0.5", isDark ? STATUS_CONFIG[systemData.system_status].dark : STATUS_CONFIG[systemData.system_status].light)}
          >
            <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full inline-block", STATUS_CONFIG[systemData.system_status].dot)} />
            {t("operations.missionComplete.maintenance.system")} {STATUS_CONFIG[systemData.system_status].label}
          </Badge>
        </div>
      )}
      <div className="space-y-3">
        {systemData!.components.map((comp) => {
          const cfg = STATUS_CONFIG[comp.status];
          const inp = inputs[comp.component_id];
          const previewHours = addHhmmHours(comp.current_hours, inp?.add_hours || 0);
          const previewFlights = comp.current_flights + (inp?.add_flights || 0);
          const hasFlightLimit = comp.limit_flight > 0;
          const hasHourLimit = comp.limit_hour > 0;
          const hasDayLimit = comp.limit_day > 0;
          const isAutoSynced = autoSyncedIds.has(comp.component_id);

          return (
            <div
              key={comp.component_id}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isAutoSynced
                  ? isDark ? "border-emerald-500/30 bg-emerald-500/5" : "border-emerald-300 bg-emerald-50/60"
                  : isDark ? "border-white/6 bg-slate-900/40" : "border-slate-200 bg-white"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>
                    {comp.component_type ?? "Component"}
                  </span>
                  {comp.component_code && (
                    <span className={cn("text-[11px] font-medium", isDark ? "text-slate-300" : "text-slate-700")}>{comp.component_code}</span>
                  )}
                  {comp.serial_number && (
                    <span className={cn("text-[10px] font-mono", isDark ? "text-slate-500" : "text-slate-400")}>SN: {comp.serial_number}</span>
                  )}
                  {isAutoSynced && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide border",
                      isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      <Sparkles className="h-2.5 w-2.5" />
                      {t("operations.missionComplete.maintenance.autoSynced")}
                    </span>
                  )}
                </div>
                <Badge variant="outline" className={cn("text-[9px] font-medium px-1.5 py-0", isDark ? cfg.dark : cfg.light)}>
                  <span className={cn("mr-1 h-1 w-1 rounded-full inline-block", cfg.dot)} />
                  {cfg.label}
                </Badge>
              </div>

              <div className="mb-3">
                <span className={cn("text-[10px]", isDark ? "text-slate-600" : "text-slate-400")}>
                  {t("operations.missionComplete.maintenance.lastUpdated")}{" "}
                  <span className={cn("font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
                    {formatLastMaintenance(comp.last_maintenance_date)}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                {hasFlightLimit && (
                  <CycleProgressBar
                    current={previewFlights}
                    limit={comp.limit_flight}
                    label={t("operations.missionComplete.maintenance.flights")}
                    icon={Plane}
                    status={comp.status}
                    isDark={isDark}
                  />
                )}
                {hasHourLimit && (
                  <CycleProgressBar
                    current={previewHours}
                    limit={comp.limit_hour}
                    label={t("operations.missionComplete.maintenance.hours")}
                    icon={Clock}
                    status={comp.status}
                    isDark={isDark}
                    isHours
                  />
                )}
                {hasDayLimit && (
                  <CycleProgressBar
                    current={comp.current_days}
                    limit={comp.limit_day}
                    label="Days"
                    icon={CalendarDays}
                    status={comp.status}
                    isDark={isDark}
                  />
                )}
              </div>

              {(hasFlightLimit || hasHourLimit) && (
                <div className={cn("rounded-lg border p-3", isDark ? "border-white/4 bg-slate-800/40" : "border-slate-100 bg-slate-50/80")}>
                  <p className={cn("text-[10px] uppercase tracking-wider font-medium mb-2", isDark ? "text-slate-500" : "text-slate-400")}>
                    {t("operations.missionComplete.maintenance.addUsage")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {hasFlightLimit && (
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium w-10", isDark ? "text-slate-400" : "text-slate-500")}>
                          {t("operations.missionComplete.maintenance.flights")}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFlight(comp.component_id)}
                          className={cn(
                            "h-7 px-3 rounded-md text-xs font-semibold border transition-colors",
                            inp?.add_flights === 1
                              ? isDark ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-violet-500 bg-violet-50 text-violet-700"
                              : isDark ? "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >+1</button>
                        {inp?.add_flights > 0 && (
                          <span className={cn("text-[10px] tabular-nums", isDark ? "text-slate-400" : "text-slate-500")}>
                            {comp.current_flights} → {previewFlights}
                          </span>
                        )}
                      </div>
                    )}
                    {hasHourLimit && (
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium w-10", isDark ? "text-slate-400" : "text-slate-500")}>
                          {t("operations.missionComplete.maintenance.hours")}
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={hoursRaw[comp.component_id] ?? ""}
                            onChange={(e) => onHoursChange(comp.component_id, e.target.value)}
                            className={cn(
                              "h-7 w-20 rounded-md text-xs font-semibold border transition-colors text-center tabular-nums outline-none",
                              isDark
                                ? "border-slate-600 bg-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
                                : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
                            )}
                          />
                        </div>
                        <span className={cn("text-[9px] uppercase tracking-wider", isDark ? "text-slate-600" : "text-slate-400")}>
                          {t("operations.missionComplete.maintenance.hmin")}
                        </span>
                        {inp?.add_hours > 0 && (
                          <>
                            <span className={cn("text-[10px] tabular-nums", isDark ? "text-slate-400" : "text-slate-500")}>
                              {formatHhmmHours(comp.current_hours)} → {formatHhmmHours(previewHours)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onResetHours(comp.component_id)}
                              className={cn("h-5 w-5 rounded flex items-center justify-center text-[10px] border transition-colors", isDark ? "border-slate-600 bg-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/40" : "border-slate-200 bg-white text-slate-400 hover:text-rose-500 hover:border-rose-300")}
                              title="Reset hours"
                            >×</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {hasDayLimit && (
                    <p className={cn("mt-2 text-[10px] italic", isDark ? "text-slate-600" : "text-slate-400")}>
                      {t("operations.missionComplete.maintenance.daysTracked")}
                    </p>
                  )}
                </div>
              )}

              {comp.status === "DUE" && (
                <div className={cn("mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]", isDark ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-600 border border-rose-200")}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("operations.missionComplete.maintenance.overdue")}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
