"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function ReportIssueModal({ open, onClose, toolId, toolCode, missionId, isDark }: Props) {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<number[]>([]);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComponents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/operation/board/maintenance-cycle?tool_id=${toolId}`);
      if (data.code === 1 && data.data?.components) {
        setComponents(data.data.components);
      }
    } catch {
      // Components optional — fail silently
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    if (open && toolId > 0) {
      loadComponents();
      setDescription("");
      setSelectedComponents([]);
      setPriority("MEDIUM");
    }
  }, [open, toolId, loadComponents]);

  function toggleComponent(id: number) {
    setSelectedComponents((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

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
        components: selectedComponents.length > 0 ? selectedComponents : undefined,
        priority,
      });

      if (data.status === "OK") {
        toast.success("Issue reported — maintenance ticket created");
        onClose();
      } else {
        toast.error(data.message || "Failed to report issue");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to report issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className={cn(
          "!max-w-[520px] w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0",
          isDark ? "bg-[#0f1419] border-white/[0.08]" : "bg-white border-slate-200"
        )}
      >
        <DialogHeader
          className={cn(
            "px-6 pb-4 pt-6",
            isDark ? "bg-slate-900/60" : "bg-slate-50 border-b border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
              )}
            >
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle
                className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}
              >
                Report Issue
              </DialogTitle>
              <p className={cn("mt-0.5 text-[12px]", isDark ? "text-slate-500" : "text-slate-400")}>
                {toolCode} — this will open a maintenance ticket
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Issue description */}
          <div>
            <label className={cn("text-xs font-medium block mb-1.5", isDark ? "text-slate-400" : "text-slate-600")}>
              Issue Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue observed during or after the flight…"
              rows={4}
              className={cn(
                "text-sm resize-none",
                isDark ? "bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500" : ""
              )}
            />
          </div>

          {/* Priority */}
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

          {/* Component selection */}
          {!loading && components.length > 0 && (
            <div>
              <label className={cn("text-xs font-medium block mb-1.5", isDark ? "text-slate-400" : "text-slate-600")}>
                Affected Component(s) <span className={isDark ? "text-slate-600" : "text-slate-400"}>(optional)</span>
              </label>
              <div className="space-y-1.5">
                {components.map((comp) => {
                  const selected = selectedComponents.includes(comp.component_id);
                  return (
                    <button
                      key={comp.component_id}
                      type="button"
                      onClick={() => toggleComponent(comp.component_id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? isDark
                            ? "border-violet-500/50 bg-violet-500/10"
                            : "border-violet-300 bg-violet-50"
                          : isDark
                            ? "border-white/[0.06] bg-slate-900/40 hover:bg-slate-900/60"
                            : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          selected
                            ? "bg-violet-600 border-violet-600"
                            : isDark ? "border-slate-600" : "border-slate-300"
                        )}
                      >
                        {selected && (
                          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                      {selected && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-auto text-[9px] shrink-0",
                            isDark
                              ? "border-violet-500/40 text-violet-400"
                              : "border-violet-300 text-violet-600"
                          )}
                        >
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedComponents.length === 0 && (
                <p className={cn("mt-1.5 text-[10px]", isDark ? "text-slate-600" : "text-slate-400")}>
                  No component selected — ticket will apply to the whole system.
                </p>
              )}
            </div>
          )}

          <div
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2.5 text-[11px]",
              isDark
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            )}
          >
            <Wrench className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>A maintenance ticket will be opened and the maintenance team will be notified.</span>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center justify-end gap-2 px-6 py-4 border-t",
            isDark ? "border-white/[0.06] bg-slate-900/30" : "border-slate-200 bg-slate-50"
          )}
        >
          <Button
            variant="outline"
            onClick={onClose}
            className={cn("h-9 px-4 text-sm", isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "")}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
            className="h-9 px-4 text-sm bg-red-600 hover:bg-red-500 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Reporting…
              </>
            ) : (
              "Report Issue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
