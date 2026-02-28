"use client";

import { Mission } from "@/config/types/operation";
import { cn } from "@/lib/utils";
import { MissionCard } from "./MissionCard";

interface KanbanColumnProps {
  title: string;
  count: number;
  missions: Mission[];
  accentClass: string;
  columnId: "scheduled" | "in_progress" | "done";
  onDragStart: (e: React.DragEvent, missionId: number, sourceColumn: string) => void;
  onDrop: (e: React.DragEvent, targetColumn: string) => void;
  onViewDetails: (mission: Mission) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isDark: boolean
}

export function KanbanColumn({
  title,
  count,
  missions,
  accentClass,
  columnId,
  onDragStart,
  onDrop,
  onViewDetails,
  isDragOver,
  onDragOver,
  onDragLeave,
  isDark
}: KanbanColumnProps) {

  return (
    <div
      className={cn(
        "flex min-h-[calc(100vh-220px)] flex-col rounded-xl border transition-all duration-200",
        isDark
          ? "border-white/[0.06] bg-slate-950/50"
          : "border-slate-200 bg-white shadow-sm",
        isDragOver &&
          (isDark
            ? "border-white/20 bg-slate-800/40 shadow-xl shadow-black/30"
            : "border-slate-400/50 bg-slate-100 shadow-lg shadow-slate-200/60")
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, columnId)}
      onDragLeave={onDragLeave}
    >
      <div className={cn("flex items-center justify-between border-b px-4 py-3", accentClass)}>
        <h3 className={`text-[13px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          {title}
        </h3>
        <div className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${isDark ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
          {count}
        </div>
      </div>

      {isDragOver && (
        <div className={`mx-3 my-2 flex h-14 items-center justify-center rounded-lg border-2 border-dashed ${isDark ? "border-white/20" : "border-slate-300"}`}>
          <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Drop here</span>
        </div>
      )}

      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        {missions.length === 0 && !isDragOver && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={`mb-2 h-8 w-8 rounded-full ${isDark ? "bg-white/[0.04]" : "bg-slate-100"}`} />
            <p className={`text-[11px] ${isDark ? "text-slate-600" : "text-slate-400"}`}>No missions</p>
          </div>
        )}
        {missions.map((mission) => (
          <MissionCard
            key={mission.mission_id}
            mission={mission}
            draggable
            onDragStart={(e) => onDragStart(e, mission.mission_id, columnId)}
            onViewDetails={onViewDetails}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}