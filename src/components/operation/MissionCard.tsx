"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mission, MissionStatusCode } from "@/config/types/operation";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, ClipboardList, Clock, Crosshair, Gauge, Tag, User, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MissionLimitsPanel } from "./MissionLimitsPanel";

interface MissionCardProps {
  mission: Mission;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, missionId: number) => void;
  onViewDetails?: (mission: Mission) => void;
  onOpenTasks?: (mission: Mission) => void;
  onOpenLuc?: (mission: Mission) => void;
  onUpdateMaintenance?: () => void;
  isDark: boolean
}

const statusConfig: Record<
  MissionStatusCode,
  { darkColor: string; lightColor: string; dot: string }
> = {
  "00": {
    darkColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    lightColor: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-400",
  },
  "05": {
    darkColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    lightColor: "bg-amber-50 text-amber-600 border-amber-200",
    dot: "bg-amber-400 animate-pulse",
  },
  "10": {
    darkColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    lightColor: "bg-emerald-50 text-emerald-600 border-emerald-200",
    dot: "bg-emerald-400",
  },
  "99": {
    darkColor: "bg-red-500/10 text-red-400 border-red-500/30",
    lightColor: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-400",
  },
  "101": {
    darkColor: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    lightColor: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  },
};

const maintenanceStatusConfig: Record<
  string,
  { darkDot: string; lightDot: string; darkBg: string; lightBg: string }
> = {
  OK: {
    darkDot: "bg-emerald-400",
    lightDot: "bg-emerald-500",
    darkBg: "bg-emerald-500/10 border-emerald-500/30",
    lightBg: "bg-emerald-50 border-emerald-200",
  },
  ALERT: {
    darkDot: "bg-amber-400 animate-pulse",
    lightDot: "bg-amber-500 animate-pulse",
    darkBg: "bg-amber-500/10 border-amber-500/30",
    lightBg: "bg-amber-50 border-amber-200",
  },
  DUE: {
    darkDot: "bg-rose-400",
    lightDot: "bg-rose-500",
    darkBg: "bg-rose-500/10 border-rose-500/30",
    lightBg: "bg-rose-50 border-rose-200",
  },
  IN_MAINTENANCE: {
    darkDot: "bg-blue-400 animate-pulse",
    lightDot: "bg-blue-500 animate-pulse",
    darkBg: "bg-blue-500/10 border-blue-500/30",
    lightBg: "bg-blue-50 border-blue-200",
  },
};

type LucSectionKey = "checklist" | "communication" | "assignment";

function lucSectionSummaries(progress: Mission["luc_procedure_progress"]) {
  const keys: LucSectionKey[] = ["checklist", "communication", "assignment"];
  const labels: Record<LucSectionKey, string> = {
    checklist: "Checklist",
    communication: "Comm",
    assignment: "Assign.",
  };
  return keys.map((key) => {
    const o = progress?.[key] ?? {};
    const entries = Object.values(o);
    const done = entries.filter((v) => v === "Y").length;
    return { key, label: labels[key], done, total: entries.length };
  });
}

const STATUS_LABEL_KEY: Record<MissionStatusCode, string> = {
  "00": "operations.board.status.scheduled",
  "05": "operations.board.status.inProgress",
  "10": "operations.board.card.status.done",
  "99": "operations.board.status.cancelled",
  "101": "operations.board.card.status.pending",
};

const MAINTENANCE_LABEL_KEY: Record<string, string> = {
  OK: "operations.board.card.maintenanceStatus.ok",
  ALERT: "operations.board.card.maintenanceStatus.alert",
  DUE: "operations.board.card.maintenanceStatus.due",
  IN_MAINTENANCE: "operations.board.card.maintenanceStatus.inMaintenance",
};

export function MissionCard({ mission, draggable, onDragStart, onViewDetails, onOpenTasks, onOpenLuc, onUpdateMaintenance, isDark}: MissionCardProps) {
  const { t } = useTranslation();

  const statusCfg = statusConfig[mission.mission_status_code] ?? statusConfig["00"];
  const statusColor = isDark ? statusCfg.darkColor : statusCfg.lightColor;
  const hasPilot = mission.fk_pic_id > 0;

  return (
    <Card
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, mission.mission_id)}
      data-mission-id={mission.mission_id}
      data-vehicle-id={mission.fk_vehicle_id}
      className={cn(
        "group relative w-full shrink-0 overflow-hidden border transition-all duration-200",
        isDark
          ? "border-white/[0.06] bg-slate-900/60 backdrop-blur-sm hover:border-white/[0.12] hover:bg-slate-800/70 hover:shadow-lg hover:shadow-black/40"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md",
        draggable && "cursor-grab active:cursor-grabbing",
        mission.mission_status_code === "05" &&
          (isDark ? "border-amber-500/20 shadow-amber-500/5" : "border-amber-300/50")
      )}
    >
      {mission.mission_status_code === "05" && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0" />
      )}

      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={isDark
                ? "border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-400"
                : "border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700"
              }
            >
              {mission.client_name || "—"}
            </Badge>
            {mission.mission_group_label && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                <Tag className="mr-0.5 h-2.5 w-2.5" />
                {mission.mission_group_label}
              </Badge>
            )}
          </div>
          <span className={`shrink-0 font-mono text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            #{mission.mission_id}
          </span>
        </div>

        <div>
          <p className={`text-[13px] font-semibold leading-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            {mission.vehicle_code}
            {mission.maintenance_status && mission.maintenance_status !== "OK" && (() => {
              const mCfg = maintenanceStatusConfig[mission.maintenance_status];
              return (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(
                        "ml-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-medium align-middle cursor-default",
                        isDark ? mCfg.darkBg : mCfg.lightBg
                      )}>
                        <Wrench className="h-2.5 w-2.5" />
                        <span className={cn("h-1.5 w-1.5 rounded-full", isDark ? mCfg.darkDot : mCfg.lightDot)} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{t(MAINTENANCE_LABEL_KEY[mission.maintenance_status!])}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
            {mission.vehicle_desc && (
              <span className={`font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {" "}— {mission.vehicle_desc}
              </span>
            )}
          </p>
          {mission.mission_planning_code && (
            <p className={`mt-0.5 truncate text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {mission.mission_planning_code}
              {mission.mission_planning_desc ? ` · ${mission.mission_planning_desc}` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", statusColor)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
            {t(STATUS_LABEL_KEY[mission.mission_status_code] ?? STATUS_LABEL_KEY["00"])}
          </span>
          {mission.mission_category_desc && (
            <Badge
              variant="outline"
              className={isDark
                ? "border-sky-500/20 bg-sky-500/10 px-1.5 py-0 text-[10px] text-sky-400"
                : "border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] text-sky-600"
              }
            >
              <Crosshair className="mr-0.5 h-2.5 w-2.5" />
              {mission.mission_category_desc}
            </Badge>
          )}
          {mission.mission_type_desc && (
            <Badge
              variant="outline"
              className={isDark
                ? "border-violet-500/20 bg-violet-500/10 px-1.5 py-0 text-[10px] text-violet-400"
                : "border-violet-200 bg-violet-50 px-1.5 py-0 text-[10px] text-violet-600"
              }
            >
              {mission.mission_type_desc}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2 pt-1">
        <div className="flex items-center gap-1.5 text-[11px]">
          <User className={`h-3 w-3 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
          {!hasPilot ? (
            <span className={isDark
              ? "rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400"
              : "rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600"
            }>
              {t("operations.board.card.notAssigned")}
            </span>
          ) : (
            <span className={isDark ? "text-slate-300" : "text-slate-700"}>{mission.pic_fullname}</span>
          )}
        </div>

        <div className="mt-1.5 space-y-1">
          <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Calendar className={`h-3 w-3 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
            <span>{mission.date_start} {mission.time_start}</span>
          </div>
          {mission.date_end && (
            <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
              <span>{mission.date_end} {mission.time_end}</span>
            </div>
          )}
          {mission.flown_time != null && (
            <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <Clock className={`h-3 w-3 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <span>{mission.flown_time} min</span>
              {mission.flown_meter != null && (
                <>
                  <Gauge className={`h-3 w-3 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <span>{(mission.flown_meter / 1000).toFixed(1)} km</span>
                </>
              )}
            </div>
          )}
          {mission.mission_result_desc && (
            <Badge
              variant="outline"
              className={isDark
                ? "border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400"
                : "border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700"
              }
            >
              {mission.mission_result_desc}
            </Badge>
          )}
        </div>

        <MissionLimitsPanel limitJson={mission.mission_planning_limit_json} isDark={isDark} />

        {onOpenLuc != null && mission.fk_luc_procedure_id != null && (
          <div className={cn("mt-3 border-t pt-2", isDark ? "border-white/[0.08]" : "border-slate-100")}>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide", isDark ? "text-slate-500" : "text-slate-500")}>
                  {t("operations.board.card.lucProcedureTasks")}
                </p>
                {mission.luc_completed_at ? (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      isDark
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    )}
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    {t("operations.board.card.lucAllCompleted")}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {lucSectionSummaries(mission.luc_procedure_progress).map(({ key, label, done, total }) =>
                      total === 0 ? null : (
                        <span
                          key={key}
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 font-mono text-[9px]",
                            isDark ? "border-slate-600 bg-slate-800/80 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
                          )}
                        >
                          {label} {done}/{total}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
              {!mission.luc_completed_at && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenLuc(mission)}
                  className={cn(
                    "h-7 shrink-0 px-2.5 text-[11px] font-semibold",
                    isDark ? "bg-violet-600 text-white hover:bg-violet-500" : "bg-violet-600 text-white hover:bg-violet-700"
                  )}
                >
                  <ClipboardList className="mr-1 h-3.5 w-3.5" />
                  {t("operations.board.card.completeLucTasks")}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className={`flex items-center justify-between gap-2 border-t px-4 py-2 ${isDark ? "border-white/4" : "border-slate-100"}`}>
        <div className="flex items-center gap-2">
          {onOpenTasks && (
            <Button
              size="sm"
              onClick={() => onOpenTasks(mission)}
              className={cn(
                "h-7 px-2.5 text-[11px] font-semibold",
                isDark
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              {t("operations.board.card.completeTasks")}
            </Button>
          )}
          {onUpdateMaintenance && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onUpdateMaintenance}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                      isDark
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                        : "border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"
                    )}
                  >
                    <Wrench className="h-2.5 w-2.5" />
                    {t("operations.board.card.updateMaintenance")}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t("operations.board.card.updateMaintenanceCycle")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 px-2.5 text-[11px] ${isDark
                  ? "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
                onClick={() => onViewDetails?.(mission)}
              >
                {t("operations.board.card.view")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t("operations.board.card.missionDetails")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}