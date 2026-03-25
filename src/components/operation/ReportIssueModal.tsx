"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import axios from "axios";
import { AlertTriangle, Loader2, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  status: "OK" | "ALERT" | "DUE";
}

interface Props {
  open: boolean;
  onClose: () => void;
  toolId: number;
  toolCode: string;
  missionId: number;
  isDark: boolean;
}

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", className: "bg-slate-50 text-slate-600 border-slate-200" },
  { value: "MEDIUM", label: "Medium", className: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "HIGH", label: "High", className: "bg-red-50 text-red-600 border-red-200" },
] as const;

type Priority = "LOW" | "MEDIUM" | "HIGH";

const STATUS_STYLE: Record<string, string> = {
  OK:    "text-emerald-600 bg-emerald-50 border-emerald-200",
  ALERT: "text-amber-600 bg-amber-50 border-amber-200",
  DUE:   "text-rose-600 bg-rose-50 border-rose-200",
};

function CycleBar({ current, limit, unit }: { current: number; limit: number; unit: string }) {
  if (!limit) return <span className="text-xs text-slate-400">—</span>;
  const pct = Math.min((current / limit) * 100, 100);
  const color = pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex flex-col gap-0.5 min-w-14">
      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-slate-400 tabular-nums">{current}/{limit} {unit}</span>
    </div>
  );
}

export function ReportIssueModal({ open, onClose, toolId, toolCode, missionId, isDark }: Props) {
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [checking, setChecking] = useState(true);
  const [alreadyInMaintenance, setAlreadyInMaintenance] = useState(false);
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [selectedComponentIds, setSelectedComponentIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleComponent = (id: number) => {
    setSelectedComponentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const loadData = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await axios.get(`/api/operation/report-issue?tool_id=${toolId}`);
      setComponents(data?.components ?? []);
      if (data?.has_open_ticket) {
        setAlreadyInMaintenance(true);
        toast.error("This system already has an open maintenance ticket.");
      } else {
        setAlreadyInMaintenance(false);
      }
    } catch {
      setAlreadyInMaintenance(false);
      setComponents([]);
    } finally {
      setChecking(false);
    }
  }, [toolId]);

  useEffect(() => {
    if (open && toolId > 0) {
      setDescription("");
      setPriority("MEDIUM");
      loadData();
    }
  }, [open, toolId, loadData]);

  async function handleSubmit() {
    if (!description.trim()) {
      toast.error("Please describe the issue");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post("/api/operation/report-issue", {
        fk_tool_id: toolId,
        issue_description: description.trim(),
        priority,
        selected_component_ids: selectedComponentIds,
      });
      if (data.status === "OK") {
        toast.success("Issue reported — maintenance ticket created");
        onClose();
      } else {
        toast.error(data.message || "Failed to report issue");
      }
    } catch (e: any) {
      const msg = e.response?.data?.message ?? "Failed to report issue";
      toast.error(msg);
      if (e.response?.status === 409) setAlreadyInMaintenance(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className={cn(
          "!max-w-[540px] w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0",
          isDark ? "bg-[#0f1419] border-white/[0.08]" : "bg-white border-slate-200"
        )}
      >
        <DialogHeader
          className={cn(
            "px-6 pb-4 pt-6 shrink-0",
            isDark ? "bg-slate-900/60" : "bg-slate-50 border-b border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                Report Issue
              </DialogTitle>
              <p className={cn("mt-0.5 text-[12px]", isDark ? "text-slate-500" : "text-slate-400")}>
                {toolCode} — this will open a maintenance ticket
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {checking ? (
            <div className="space-y-3">
              <Skeleton className={cn("h-4 w-48", isDark ? "bg-slate-700" : "")} />
              <Skeleton className={cn("h-24 w-full rounded-lg", isDark ? "bg-slate-800" : "")} />
              <Skeleton className={cn("h-10 w-full rounded-lg", isDark ? "bg-slate-800" : "")} />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className={cn("h-14 w-full rounded-lg", isDark ? "bg-slate-800" : "")} />
                ))}
              </div>
            </div>
          ) : alreadyInMaintenance ? (
            <div className={cn("flex items-start gap-3 rounded-lg px-4 py-4 text-sm", isDark ? "bg-blue-500/10 text-blue-300 border border-blue-500/20" : "bg-blue-50 text-blue-700 border border-blue-200")}>
              <Wrench className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-0.5">Already in maintenance</p>
                <p className="text-xs opacity-80">
                  This system already has an open maintenance ticket. Close the existing ticket before reporting a new issue.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className={cn("text-xs font-medium block mb-1.5", isDark ? "text-slate-400" : "text-slate-600")}>
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue observed during or after the flight…"
                  rows={3}
                  className={cn("text-sm resize-none", isDark ? "bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500" : "")}
                />
              </div>

              <div>
                <label className={cn("text-xs font-medium block mb-1.5", isDark ? "text-slate-400" : "text-slate-600")}>
                  Priority
                </label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                        priority === opt.value
                          ? opt.className + " ring-2 ring-offset-1 ring-current"
                          : isDark
                            ? "border-slate-700 text-slate-400 hover:border-slate-600"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {components.length > 0 && (
                <div>
                  <label className={cn("text-xs font-medium block mb-1.5", isDark ? "text-slate-400" : "text-slate-600")}>
                    Affected Components <span className={cn("text-[10px] font-normal", isDark ? "text-slate-500" : "text-slate-400")}>(select all that apply)</span>
                  </label>
                  <div className="space-y-1.5">
                    {components.map((comp) => {
                      const isSelected = selectedComponentIds.includes(comp.component_id);
                      return (
                        <button
                          key={comp.component_id}
                          type="button"
                          onClick={() => toggleComponent(comp.component_id)}
                          className={cn(
                            "w-full text-left rounded-lg border px-3 py-2.5 transition-all",
                            isSelected
                              ? isDark
                                ? "border-red-500/50 bg-red-500/10"
                                : "border-red-300 bg-red-50"
                              : isDark
                                ? "border-white/[0.06] bg-slate-900/40 hover:border-white/[0.12]"
                                : "border-slate-200 bg-slate-50 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center",
                                isSelected
                                  ? "bg-red-500 border-red-500"
                                  : isDark ? "border-slate-600" : "border-slate-300"
                              )}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-xs font-medium truncate", isDark ? "text-slate-200" : "text-slate-700")}>
                                  {comp.component_type ?? "Component"}
                                  {comp.component_code ? ` — ${comp.component_code}` : ""}
                                </p>
                                {comp.serial_number && (
                                  <p className={cn("text-[10px] font-mono", isDark ? "text-slate-500" : "text-slate-400")}>
                                    SN: {comp.serial_number}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0", STATUS_STYLE[comp.status] ?? STATUS_STYLE.OK)}>
                              {comp.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 pl-5">
                            <CycleBar current={comp.current_hours} limit={comp.limit_hour} unit="h" />
                            <CycleBar current={comp.current_flights} limit={comp.limit_flight} unit="fl" />
                            <CycleBar current={comp.current_days} limit={comp.limit_day} unit="d" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2.5 text-[11px]", isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200")}>
                <Wrench className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>A maintenance ticket will be opened and the maintenance team will be notified.</span>
              </div>
            </>
          )}
        </div>

        <div className={cn("flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0", isDark ? "border-white/[0.06] bg-slate-900/30" : "border-slate-200 bg-slate-50")}>
          <Button
            variant="outline"
            onClick={onClose}
            className={cn("h-9 px-4 text-sm", isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "")}
          >
            {alreadyInMaintenance ? "Close" : "Cancel"}
          </Button>
          {!alreadyInMaintenance && !checking && (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !description.trim()}
              className="h-9 px-4 text-sm bg-red-600 hover:bg-red-500 text-white"
            >
              {submitting ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Reporting…</>
              ) : (
                "Report Issue"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
