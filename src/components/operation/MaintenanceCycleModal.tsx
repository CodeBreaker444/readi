"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import axios from "axios";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Plane,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";


interface ComponentInfo {
  component_id: number;
  component_type: string | null;
  component_code: string | null;
  serial_number: string | null;
  total_hours: number;
  total_flights: number;
  days_since_maintenance: number | null;
  maintenance_cycle_hour: number;
  maintenance_cycle_flight: number;
  maintenance_cycle_day: number;
  maintenance_cycle_type: string;
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
  add_days: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  toolId: number;
  missionId: number;
  isDark: boolean;
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


function CycleProgressBar({
  value,
  max,
  label,
  icon: Icon,
  status,
  isDark,
}: {
  value: number | null;
  max: number;
  label: string;
  icon: React.ElementType;
  status: "OK" | "ALERT" | "DUE";
  isDark: boolean;
}) {
  if (!max || max === 0) return null;

  const intVal = Math.floor(value ?? 0);
  const pct = Math.min(100, (intVal / max) * 100);
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-3 w-3",
            isDark ? "text-slate-500" : "text-slate-400"
          )}
        />
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-medium",
            isDark ? "text-slate-500" : "text-slate-400"
          )}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          "h-1.5 w-full rounded-full overflow-hidden",
          isDark ? "bg-slate-700" : "bg-slate-100"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", cfg.barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={cn(
          "text-xs tabular-nums",
          isDark ? "text-slate-400" : "text-slate-500"
        )}
      >
        {intVal}
        <span className={isDark ? "text-slate-600" : "text-slate-400"}>
          /{max}
        </span>
      </p>
    </div>
  );
}


export function MaintenanceCycleModal({
  open,
  onClose,
  toolId,
  missionId,
  isDark,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [inputs, setInputs] = useState<Record<number, ComponentInput>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/operation/board/maintenance-cycle?tool_id=${toolId}`
      );
      if (data.code === 1 && data.data) {
        const sys = data.data as SystemData;
        setSystemData(sys);

        const initial: Record<number, ComponentInput> = {};
        for (const comp of sys.components) {
          initial[comp.component_id] = {
            component_id: comp.component_id,
            add_flights: 0,
            add_hours: 0,
            add_days: 0,
          };
        }
        setInputs(initial);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to load maintenance data");
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    if (open && toolId > 0) loadData();
  }, [open, toolId, loadData]);

  const updateInput = (
    compId: number,
    field: "add_flights" | "add_hours" | "add_days",
    value: string
  ) => {
    const maxMap = { add_flights: 10, add_hours: 24, add_days: 30 };
    const num = value === "" ? 0 : Number(value);
    if (isNaN(num) || num < 0 || num > maxMap[field]) return;

    setInputs((prev) => ({
      ...prev,
      [compId]: { ...prev[compId], [field]: num },
    }));
  };

  const handleSubmit = async () => {
    if (!systemData) return;

    const components = Object.values(inputs).filter(
      (inp) => inp.add_flights > 0 || inp.add_hours > 0 || inp.add_days > 0
    );

    if (components.length === 0) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        "/api/operation/board/maintenance-cycle/update",
        {
          tool_id: toolId,
          mission_id: missionId,
          components,
        }
      );

      if (data.code === 1) {
        toast.success("Maintenance tracking updated");
        onClose();
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to update maintenance");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const hasComponents = systemData && systemData.components.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "!max-w-[680px] w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0",
          isDark ? "bg-[#0f1419] border-white/[0.08]" : "bg-white border-slate-200"
        )}
      >
        {/* Header */}
        <DialogHeader
          className={cn(
            "relative overflow-hidden px-6 pb-4 pt-6",
            isDark ? "bg-slate-900/60" : "bg-slate-50 border-b border-slate-200"
          )}
        >
          {isDark && (
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-violet-500/10 to-transparent" />
          )}

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                isDark
                  ? "bg-violet-500/10 text-violet-400"
                  : "bg-violet-50 text-violet-600"
              )}
            >
              <Wrench className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle
                className={cn(
                  "text-base font-bold",
                  isDark ? "text-white" : "text-slate-900"
                )}
              >
                Maintenance Cycle Update
              </DialogTitle>
              {systemData && (
                <p
                  className={cn(
                    "mt-0.5 text-[12px]",
                    isDark ? "text-slate-500" : "text-slate-400"
                  )}
                >
                  {systemData.tool_code}
                  {systemData.tool_name ? ` — ${systemData.tool_name}` : ""}
                </p>
              )}
            </div>
          </div>

          {systemData && (
            <div className="mt-3">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5",
                  isDark
                    ? STATUS_CONFIG[systemData.system_status].dark
                    : STATUS_CONFIG[systemData.system_status].light
                )}
              >
                <span
                  className={cn(
                    "mr-1.5 h-1.5 w-1.5 rounded-full inline-block",
                    STATUS_CONFIG[systemData.system_status].dot
                  )}
                />
                System {STATUS_CONFIG[systemData.system_status].label}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className={cn(
                  "h-6 w-6 animate-spin",
                  isDark ? "text-slate-500" : "text-slate-400"
                )}
              />
            </div>
          ) : !hasComponents ? (
            <div className="py-12 text-center">
              <CheckCircle2
                className={cn(
                  "mx-auto mb-3 h-8 w-8",
                  isDark ? "text-slate-600" : "text-slate-300"
                )}
              />
              <p
                className={cn(
                  "text-sm",
                  isDark ? "text-slate-500" : "text-slate-400"
                )}
              >
                No components configured for this system.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {systemData!.components.map((comp) => {
                const cfg = STATUS_CONFIG[comp.status];
                const inp = inputs[comp.component_id];

                const showFlights = comp.maintenance_cycle_flight > 0;
                const showHours = comp.maintenance_cycle_hour > 0;
                const showDays = comp.maintenance_cycle_day > 0;

                return (
                  <div
                    key={comp.component_id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      isDark
                        ? "border-white/[0.06] bg-slate-900/40 hover:bg-slate-900/60"
                        : "border-slate-200 bg-white hover:bg-slate-50/50"
                    )}
                  >
                    {/* Component header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium",
                            isDark
                              ? "bg-slate-700 text-slate-300"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {comp.component_type ?? "Component"}
                        </span>
                        {comp.component_code && (
                          <span
                            className={cn(
                              "text-[11px] font-medium",
                              isDark ? "text-slate-300" : "text-slate-700"
                            )}
                          >
                            {comp.component_code}
                          </span>
                        )}
                        {comp.serial_number && (
                          <span
                            className={cn(
                              "text-[10px] font-mono",
                              isDark ? "text-slate-500" : "text-slate-400"
                            )}
                          >
                            SN: {comp.serial_number}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-medium px-1.5 py-0",
                          isDark ? cfg.dark : cfg.light
                        )}
                      >
                        <span
                          className={cn(
                            "mr-1 h-1 w-1 rounded-full inline-block",
                            cfg.dot
                          )}
                        />
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Progress bars */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <CycleProgressBar
                        value={comp.total_flights}
                        max={comp.maintenance_cycle_flight}
                        label="Flights"
                        icon={Plane}
                        status={comp.status}
                        isDark={isDark}
                      />
                      <CycleProgressBar
                        value={comp.total_hours}
                        max={comp.maintenance_cycle_hour}
                        label="Hours"
                        icon={Clock}
                        status={comp.status}
                        isDark={isDark}
                      />
                      <CycleProgressBar
                        value={comp.days_since_maintenance}
                        max={comp.maintenance_cycle_day}
                        label="Days"
                        icon={CalendarDays}
                        status={comp.status}
                        isDark={isDark}
                      />
                    </div>

                    {/* Input fields */}
                    {(showFlights || showHours || showDays) && (
                      <div
                        className={cn(
                          "rounded-lg border p-3",
                          isDark
                            ? "border-white/[0.04] bg-slate-800/40"
                            : "border-slate-100 bg-slate-50/80"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-medium mb-2",
                            isDark ? "text-slate-500" : "text-slate-400"
                          )}
                        >
                          Add Usage
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {showFlights && (
                            <div>
                              <label
                                className={cn(
                                  "text-[10px] font-medium block mb-1",
                                  isDark ? "text-slate-400" : "text-slate-500"
                                )}
                              >
                                Flights{" "}
                                <span className="opacity-50">(0–10)</span>
                              </label>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                value={inp?.add_flights || ""}
                                onChange={(e) =>
                                  updateInput(
                                    comp.component_id,
                                    "add_flights",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className={cn(
                                  "h-8 text-sm",
                                  isDark
                                    ? "bg-slate-700 border-slate-600 text-slate-200"
                                    : "bg-white border-slate-200"
                                )}
                              />
                            </div>
                          )}
                          {showHours && (
                            <div>
                              <label
                                className={cn(
                                  "text-[10px] font-medium block mb-1",
                                  isDark ? "text-slate-400" : "text-slate-500"
                                )}
                              >
                                Hours{" "}
                                <span className="opacity-50">(0–24)</span>
                              </label>
                              <Input
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                value={inp?.add_hours || ""}
                                onChange={(e) =>
                                  updateInput(
                                    comp.component_id,
                                    "add_hours",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className={cn(
                                  "h-8 text-sm",
                                  isDark
                                    ? "bg-slate-700 border-slate-600 text-slate-200"
                                    : "bg-white border-slate-200"
                                )}
                              />
                            </div>
                          )}
                          {showDays && (
                            <div>
                              <label
                                className={cn(
                                  "text-[10px] font-medium block mb-1",
                                  isDark ? "text-slate-400" : "text-slate-500"
                                )}
                              >
                                Days{" "}
                                <span className="opacity-50">(0–30)</span>
                              </label>
                              <Input
                                type="number"
                                min={0}
                                max={30}
                                value={inp?.add_days || ""}
                                onChange={(e) =>
                                  updateInput(
                                    comp.component_id,
                                    "add_days",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className={cn(
                                  "h-8 text-sm",
                                  isDark
                                    ? "bg-slate-700 border-slate-600 text-slate-200"
                                    : "bg-white border-slate-200"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Warning if DUE */}
                    {comp.status === "DUE" && (
                      <div
                        className={cn(
                          "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]",
                          isDark
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-rose-50 text-rose-600 border border-rose-200"
                        )}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Maintenance is overdue — schedule maintenance soon
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-end gap-2 px-6 py-4 border-t",
            isDark ? "border-white/[0.06] bg-slate-900/30" : "border-slate-200 bg-slate-50"
          )}
        >
          <Button
            variant="outline"
            onClick={onClose}
            className={cn(
              "h-9 px-4 text-sm",
              isDark
                ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                : ""
            )}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || !hasComponents}
            className="h-9 px-4 text-sm bg-violet-600 hover:bg-violet-500 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Updating…
              </>
            ) : (
              "Update Maintenance"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
