"use client";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Battery,
  CalendarClock,
  Clock,
  MapPin,
  Sparkles,
  Thermometer,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../ui/skeleton";

export interface MissionResultOption {
  mission_result_id: number;
  mission_result_code: string;
  mission_result_desc: string;
}

export interface PostFlightState {
  actual_end: string;
  result_id: number | null;
  flight_duration_min: string;
  distance_m: string;
  battery_charge_start: string;
  battery_charge_end: string;
  incident_flag: boolean;
  rth_unplanned: boolean;
  link_loss: boolean;
  deviation_flag: boolean;
  weather_temp: string;
  notes: string;
}

interface PostFlightTabProps {
  data: PostFlightState;
  resultOptions: MissionResultOption[];
  loading: boolean;
  fromLog: boolean;
  isDark: boolean;
  onChange: <K extends keyof PostFlightState>(field: K, value: PostFlightState[K]) => void;
}

function FieldLabel({ icon: Icon, label, isDark, fromLog }: {
  icon: React.ElementType;
  label: string;
  isDark: boolean;
  fromLog?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-slate-500" : "text-slate-400")} />
      <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>
        {label}
      </span>
      {fromLog && (
        <span className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide border",
          isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-600 border-emerald-200"
        )}>
          <Sparkles className="h-2.5 w-2.5" />
          From Log
        </span>
      )}
    </div>
  );
}

function inputCls(isDark: boolean) {
  return cn(
    "h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors",
    isDark
      ? "bg-slate-800/60 border-white/8 text-slate-200 placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
      : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
  );
}

function selectCls(isDark: boolean) {
  return cn(
    "h-9 w-full rounded-lg border px-3 text-sm outline-none transition-colors cursor-pointer",
    isDark
      ? "bg-slate-800/60 border-white/8 text-slate-200 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
      : "bg-white border-slate-200 text-slate-800 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
  );
}

function sectionCls(isDark: boolean) {
  return cn(
    "rounded-xl border p-4",
    isDark ? "border-white/6 bg-slate-900/40" : "border-slate-200 bg-white"
  );
}

function sectionTitle(isDark: boolean) {
  return cn("text-[10px] font-bold uppercase tracking-widest mb-3", isDark ? "text-slate-500" : "text-slate-400");
}

function CheckboxField({ label, checked, onChange, isDark }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "h-4.5 w-4.5 shrink-0 rounded border flex items-center justify-center transition-colors",
          checked
            ? "bg-violet-600 border-violet-600"
            : isDark ? "bg-slate-800/60 border-white/20" : "bg-white border-slate-300"
        )}
      >
        {checked && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={cn("text-sm", isDark ? "text-slate-300" : "text-slate-700")}>{label}</span>
    </label>
  );
}

export function PostFlightTab({ data, resultOptions, loading, fromLog, isDark, onChange }: PostFlightTabProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className={cn("h-24 w-full rounded-xl", isDark ? "bg-slate-800" : "")} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mission Outcome */}
      <div className={sectionCls(isDark)}>
        <p className={sectionTitle(isDark)}>{t("operations.missionComplete.postFlight.sections.outcome")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel icon={CalendarClock} label={t("operations.missionComplete.postFlight.fields.actualEnd")} isDark={isDark} fromLog={fromLog && !!data.actual_end} />
            <input
              type="datetime-local"
              value={data.actual_end}
              onChange={(e) => onChange("actual_end", e.target.value)}
              className={cn(inputCls(isDark), "text-xs")}
            />
          </div>
          <div>
            <FieldLabel icon={Trophy} label={t("operations.missionComplete.postFlight.fields.missionResult")} isDark={isDark} />
            <select
              value={data.result_id ?? ""}
              onChange={(e) => onChange("result_id", e.target.value ? Number(e.target.value) : null)}
              className={selectCls(isDark)}
            >
              <option value="">{t("operations.missionComplete.postFlight.placeholders.selectResult")}</option>
              {resultOptions.map((r) => (
                <option key={r.mission_result_id} value={r.mission_result_id}>
                  {r.mission_result_desc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Flight Data */}
      <div className={sectionCls(isDark)}>
        <p className={sectionTitle(isDark)}>{t("operations.missionComplete.postFlight.sections.flightData")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel icon={Clock} label={t("operations.missionComplete.postFlight.fields.duration")} isDark={isDark} fromLog={fromLog && !!data.flight_duration_min} />
            <div className="relative">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={data.flight_duration_min}
                onChange={(e) => onChange("flight_duration_min", e.target.value)}
                className={cn(inputCls(isDark), "pr-10 tabular-nums")}
              />
              <span className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none", isDark ? "text-slate-500" : "text-slate-400")}>min</span>
            </div>
          </div>
          <div>
            <FieldLabel icon={MapPin} label={t("operations.missionComplete.postFlight.fields.distanceFlown")} isDark={isDark} />
            <div className="relative">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={data.distance_m}
                onChange={(e) => onChange("distance_m", e.target.value)}
                className={cn(inputCls(isDark), "pr-8 tabular-nums")}
              />
              <span className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none", isDark ? "text-slate-500" : "text-slate-400")}>m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Battery */}
      <div className={sectionCls(isDark)}>
        <p className={sectionTitle(isDark)}>{t("operations.missionComplete.postFlight.sections.battery")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel icon={Battery} label={t("operations.missionComplete.postFlight.fields.batteryChargeStart")} isDark={isDark} />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={data.battery_charge_start}
                onChange={(e) => onChange("battery_charge_start", e.target.value)}
                className={cn(inputCls(isDark), "pr-8 tabular-nums")}
              />
              <span className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none", isDark ? "text-slate-500" : "text-slate-400")}>%</span>
            </div>
          </div>
          <div>
            <FieldLabel icon={Battery} label={t("operations.missionComplete.postFlight.fields.batteryChargeEnd")} isDark={isDark} />
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={data.battery_charge_end}
                onChange={(e) => onChange("battery_charge_end", e.target.value)}
                className={cn(inputCls(isDark), "pr-8 tabular-nums")}
              />
              <span className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none", isDark ? "text-slate-500" : "text-slate-400")}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Incidents & Flags */}
      <div className={sectionCls(isDark)}>
        <p className={sectionTitle(isDark)}>{t("operations.missionComplete.postFlight.sections.incidents")}</p>
        <div className="grid grid-cols-2 gap-3">
          <CheckboxField
            label={t("operations.missionComplete.postFlight.fields.incidentFlag")}
            checked={data.incident_flag}
            onChange={(v) => onChange("incident_flag", v)}
            isDark={isDark}
          />
          <CheckboxField
            label={t("operations.missionComplete.postFlight.fields.rthUnplanned")}
            checked={data.rth_unplanned}
            onChange={(v) => onChange("rth_unplanned", v)}
            isDark={isDark}
          />
          <CheckboxField
            label={t("operations.missionComplete.postFlight.fields.linkLoss")}
            checked={data.link_loss}
            onChange={(v) => onChange("link_loss", v)}
            isDark={isDark}
          />
          <CheckboxField
            label={t("operations.missionComplete.postFlight.fields.deviationFlag")}
            checked={data.deviation_flag}
            onChange={(v) => onChange("deviation_flag", v)}
            isDark={isDark}
          />
        </div>
        {(data.incident_flag || data.rth_unplanned || data.link_loss || data.deviation_flag) && (
          <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] mt-3", isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200")}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{t("operations.missionComplete.postFlight.validation.incidentFlagged")}</span>
          </div>
        )}
      </div>

      {/* Weather & Notes */}
      <div className={sectionCls(isDark)}>
        <p className={sectionTitle(isDark)}>{t("operations.missionComplete.postFlight.sections.weather")}</p>
        <div className="space-y-3">
          <div>
            <FieldLabel icon={Thermometer} label={t("operations.missionComplete.postFlight.fields.weatherTemp")} isDark={isDark} />
            <div className="relative w-1/2">
              <input
                type="number"
                placeholder="0"
                value={data.weather_temp}
                onChange={(e) => onChange("weather_temp", e.target.value)}
                className={cn(inputCls(isDark), "pr-8 tabular-nums")}
              />
              <span className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none", isDark ? "text-slate-500" : "text-slate-400")}>°C</span>
            </div>
          </div>
          <div>
            <FieldLabel icon={Trophy} label={t("operations.missionComplete.postFlight.sections.notes")} isDark={isDark} />
            <textarea
              rows={3}
              placeholder={t("operations.missionComplete.postFlight.placeholders.notes")}
              value={data.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-none",
                isDark
                  ? "bg-slate-800/60 border-white/8 text-slate-200 placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
                  : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
