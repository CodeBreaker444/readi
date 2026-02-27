"use client";

import { MissionPlanningLimit } from "@/config/types/operation";
import { AlertTriangle } from "lucide-react";

interface Props {
  limitJson: string;
  isDark: boolean
}

export function MissionLimitsPanel({ limitJson , isDark}: Props) {

  let parsed: MissionPlanningLimit | null = null;

  try {
    const raw = JSON.parse(limitJson);
    parsed = raw as MissionPlanningLimit;
  } catch {
    return null;
  }

  if (!parsed?.MISSION_LIMIT_VALUES) return null;

  const limits = parsed.MISSION_LIMIT_VALUES;

  const rows = [
    { label: "Route Alt", value: `${limits.MISSION_LIMIT_ROUTE_ALTITUDE_MT} m` },
    { label: "Takeoff Alt", value: `${limits.MISSION_LIMIT_TAKE_OFF_ALTITUDE_MT} m` },
    { label: "Safe Alt", value: `${limits.MISSION_LIMIT_GO_TO_SAFE_ALTITUDE_MT} m` },
    { label: "Route Speed", value: `${limits.MISSION_LIMIT_ROUTE_SPEED_MS} m/s` },
    { label: "RF Link Loss", value: limits.MISSION_LIMIT_ON_RF_LINK_LOSS },
  ];

  return (
    <div
      className={`mt-3 rounded-md border p-2.5 transition-colors ${
        isDark ? "border-red-200/60 bg-red-950/20" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle className={`h-3 w-3 ${isDark ? "text-red-400" : "text-red-500"}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? "text-red-400" : "text-red-500"}`}>
          Op Limits
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-baseline gap-1">
            <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {label}:
            </span>
            <span className={`text-[11px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}