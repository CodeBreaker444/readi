"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mission, MissionStatusCode } from "@/config/types/operation";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, Clock, Crosshair, Gauge, Tag, User } from "lucide-react";
import { MissionLimitsPanel } from "./MissionLimitsPanel";

interface MissionCardProps {
  mission: Mission;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, missionId: number) => void;
  onViewDetails?: (mission: Mission) => void;
  isDark: boolean
}

const statusConfig: Record<
  MissionStatusCode,
  { label: string; darkColor: string; lightColor: string; dot: string }
> = {
  "00": {
    label: "Scheduled",
    darkColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    lightColor: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-400",
  },
  "05": {
    label: "In Progress",
    darkColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    lightColor: "bg-amber-50 text-amber-600 border-amber-200",
    dot: "bg-amber-400 animate-pulse",
  },
  "10": {
    label: "Done",
    darkColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    lightColor: "bg-emerald-50 text-emerald-600 border-emerald-200",
    dot: "bg-emerald-400",
  },
  "99": {
    label: "Cancelled",
    darkColor: "bg-red-500/10 text-red-400 border-red-500/30",
    lightColor: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-400",
  },
  "101": {
    label: "Pending",
    darkColor: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    lightColor: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  },
};

export function MissionCard({ mission, draggable, onDragStart, onViewDetails , isDark}: MissionCardProps) {

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
        "group relative overflow-hidden border transition-all duration-200",
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
            {statusCfg.label}
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
              Not Assigned
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
      </CardContent>

      <CardFooter className={`flex items-center justify-end gap-2 border-t px-4 py-2 ${isDark ? "border-white/[0.04]" : "border-slate-100"}`}>
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
                View
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Mission details
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}