"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import axios from "axios";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileUp,
  Loader2,
  Plane,
  RefreshCw,
  Wrench,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

interface FlightLog {
  log_id: number;
  log_source: "manual" | "flytbase";
  original_filename: string;
  flytbase_flight_id: string | null;
  uploaded_at: string;
  download_url: string;
}

interface FlytbaseFlight {
  flight_id: string;
  flight_name?: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
  distance?: number;
  drone_name?: string;
  pilot_name?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSkip?: () => void;
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

const TIME_WINDOWS = [
  { label: "Last 1 hr",   minutes: 60 },
  { label: "Last 6 hrs",  minutes: 360 },
  { label: "Last 12 hrs", minutes: 720 },
  { label: "Last 24 hrs", minutes: 1440 },
];


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

function formatFlightTime(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(sec?: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}


export function MissionCompleteModal({ open, onClose, onSkip, toolId, missionId, isDark }: Props) {
  const [activeTab, setActiveTab] = useState<"maintenance" | "logs">("maintenance");

  const [loadingMaint, setLoadingMaint] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [inputs, setInputs] = useState<Record<number, ComponentInput>>({});
  const [hoursRaw, setHoursRaw] = useState<Record<number, string>>({});

  const [logs, setLogs] = useState<FlightLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [fbWindow, setFbWindow] = useState(30);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [flights, setFlights] = useState<FlytbaseFlight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [attachingFlight, setAttachingFlight] = useState(false);
  const [flightsError, setFlightsError] = useState<string | null>(null);

  const loadMaintenance = useCallback(async () => {
    setLoadingMaint(true);
    try {
      const { data } = await axios.get(`/api/operation/board/maintenance-cycle?tool_id=${toolId}`);
      if (data.code === 1 && data.data) {
        const sys = data.data as SystemData;
        setSystemData(sys);
        const init: Record<number, ComponentInput> = {};
        const initRaw: Record<number, string> = {};
        for (const c of sys.components) {
          init[c.component_id] = { component_id: c.component_id, add_flights: 0, add_hours: 0 };
          initRaw[c.component_id] = "";
        }
        setInputs(init);
        setHoursRaw(initRaw);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to load maintenance data");
    } finally {
      setLoadingMaint(false);
    }
  }, [toolId]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data } = await axios.get(`/api/operation/board/flight-logs?mission_id=${missionId}`);
      if (data.code === 1) setLogs(data.data ?? []);
    } catch(err) {
      console.log('Error in Fetching logs:',err);
      
    } finally {
      setLoadingLogs(false);
    }
  }, [missionId]);

  useEffect(() => {
    if (open && toolId > 0) {
      loadMaintenance();
      loadLogs();
    }
  }, [open, toolId, loadMaintenance, loadLogs]);

  const handleHoursChange = (compId: number, rawValue: string) => {
    if (rawValue === "") {
      setHoursRaw((prev) => ({ ...prev, [compId]: "" }));
      setInputs((prev) => ({ ...prev, [compId]: { ...prev[compId], add_hours: 0 } }));
      return;
    }
    if (!/^\d{0,3}(\.\d{0,2})?$/.test(rawValue)) return;
    if (rawValue.includes(".")) {
      const minutesPart = rawValue.split(".")[1];
      if (minutesPart && minutesPart.length === 2) {
        const minutes = parseInt(minutesPart, 10);
        if (minutes > 59) return;
      }
    }
    const numValue = parseFloat(rawValue) || 0;
    if (numValue > 999.59) return;
    const comp = systemData?.components.find((c) => c.component_id === compId);
    if (comp && comp.limit_hour > 0) {
      const remainingMin = hhmmToMinutes(comp.limit_hour) - hhmmToMinutes(comp.current_hours);
      if (hhmmToMinutes(numValue) > remainingMin) return;
    }
    setHoursRaw((prev) => ({ ...prev, [compId]: rawValue }));
    setInputs((prev) => ({ ...prev, [compId]: { ...prev[compId], add_hours: numValue } }));
  };

  const handleSubmitMaintenance = async () => {
    if (!systemData) return;
    const components = Object.values(inputs).filter((i) => i.add_flights > 0 || i.add_hours > 0);
    if (components.length === 0) { onClose(); return; }
    setSubmitting(true);
    try {
      const { data } = await axios.post("/api/operation/board/maintenance-cycle/update", {
        tool_id: toolId,
        mission_id: missionId,
        components,
      });
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

  const ALLOWED_EXTENSIONS = ['.zip', '.json', '.xml', '.gutma'];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("mission_id", String(missionId));
      form.append("file", file);
      const { data } = await axios.post("/api/operation/board/flight-logs/upload", form);
      if (data.code === 1) {
        toast.success("Flight log uploaded");
        loadLogs();
      } else {
        toast.error(data.message ?? "Upload failed");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFetchFlights = async () => {
    setLoadingFlights(true);
    setFlights([]);
    setSelectedFlight(null);
    setFlightsError(null);
    try {
      const { data } = await axios.get(`/api/flytbase/flights?window=${fbWindow}`);
      if (data.success) {
        setFlights(data.flights ?? []);
        if ((data.flights ?? []).length === 0) setFlightsError("No flights found in this time window.");
      } else {
        setFlightsError(data.message ?? "Failed to fetch flights");
      }
    } catch (e: any) {
      setFlightsError(e.response?.data?.message ?? "Failed to fetch flights");
    } finally {
      setLoadingFlights(false);
    }
  };

  const handleAttachFlight = async () => {
    if (!selectedFlight) return;
    setAttachingFlight(true);
    setFlightsError(null);
    try {
      const { data } = await axios.post("/api/operation/board/flight-logs/flytbase", {
        mission_id: missionId,
        flight_id: selectedFlight,
      });
      if (data.code === 1) {
        toast.success("Flight log attached from FlytBase");
        setSelectedFlight(null);
        setFlights([]);
        loadLogs();
      } else {
        setFlightsError(data.message ?? "Failed to attach flight");
      }
    } catch (e: any) {
      setFlightsError(e.response?.data?.message ?? "Failed to attach flight");
    } finally {
      setAttachingFlight(false);
    }
  };

  if (!open) return null;

  const hasComponents = systemData && systemData.components.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) (onSkip ?? onClose)(); }}>
      <DialogContent
        className={cn(
          "!max-w-[700px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0",
          isDark ? "bg-[#0f1419] border-white/[0.08]" : "bg-white border-slate-200"
        )}
      >
        <DialogHeader
          className={cn(
            "relative overflow-hidden px-6 pt-6 pb-0 shrink-0",
            isDark ? "bg-slate-900/60" : "bg-slate-50"
          )}
        >
          {isDark && (
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-violet-500/10 to-transparent" />
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isDark ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-600")}>
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                Mission Complete
              </DialogTitle>
              {systemData && (
                <p className={cn("mt-0.5 text-[12px]", isDark ? "text-slate-500" : "text-slate-400")}>
                  {systemData.tool_code}{systemData.tool_name ? ` — ${systemData.tool_name}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className={cn("flex border-b", isDark ? "border-white/6" : "border-slate-200")}>
            {(["maintenance", "logs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab
                    ? isDark
                      ? "border-violet-400 text-violet-400"
                      : "border-violet-600 text-violet-600"
                    : isDark
                      ? "border-transparent text-slate-500 hover:text-slate-300"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab === "maintenance" ? <Wrench className="h-3.5 w-3.5" /> : <FileUp className="h-3.5 w-3.5" />}
                {tab === "maintenance" ? "Maintenance" : "Flight Logs"}
                {tab === "logs" && logs.length > 0 && (
                  <span className={cn("ml-1 rounded-full px-1.5 py-0 text-[10px] font-semibold", isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700")}>
                    {logs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">

          {activeTab === "maintenance" && (
            <>
              {loadingMaint ? (
                <div className={cn("rounded-xl border p-4 space-y-4", isDark ? "border-white/[0.06] bg-slate-900/40" : "border-slate-200 bg-white")}>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                  </div>
                </div>
              ) : !hasComponents ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className={cn("mx-auto mb-3 h-8 w-8", isDark ? "text-slate-600" : "text-slate-300")} />
                  <p className={cn("text-sm", isDark ? "text-slate-500" : "text-slate-400")}>
                    No components configured for this system.
                  </p>
                </div>
              ) : (
                <>
                  {systemData && (
                    <div className="mb-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-medium px-2 py-0.5", isDark ? STATUS_CONFIG[systemData.system_status].dark : STATUS_CONFIG[systemData.system_status].light)}
                      >
                        <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full inline-block", STATUS_CONFIG[systemData.system_status].dot)} />
                        System {STATUS_CONFIG[systemData.system_status].label}
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

                      return (
                        <div
                          key={comp.component_id}
                          className={cn("rounded-xl border p-4 transition-colors", isDark ? "border-white/[0.06] bg-slate-900/40" : "border-slate-200 bg-white")}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>
                                {comp.component_type ?? "Component"}
                              </span>
                              {comp.component_code && (
                                <span className={cn("text-[11px] font-medium", isDark ? "text-slate-300" : "text-slate-700")}>{comp.component_code}</span>
                              )}
                              {comp.serial_number && (
                                <span className={cn("text-[10px] font-mono", isDark ? "text-slate-500" : "text-slate-400")}>SN: {comp.serial_number}</span>
                              )}
                            </div>
                            <Badge variant="outline" className={cn("text-[9px] font-medium px-1.5 py-0", isDark ? cfg.dark : cfg.light)}>
                              <span className={cn("mr-1 h-1 w-1 rounded-full inline-block", cfg.dot)} />
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="mb-3">
                            <span className={cn("text-[10px]", isDark ? "text-slate-600" : "text-slate-400")}>
                              Last updated:{" "}
                              <span className={cn("font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
                                {formatLastMaintenance(comp.last_maintenance_date)}
                              </span>
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            {hasFlightLimit && <CycleProgressBar current={previewFlights} limit={comp.limit_flight} label="Flights" icon={Plane} status={comp.status} isDark={isDark} />}
                            {hasHourLimit && <CycleProgressBar current={previewHours} limit={comp.limit_hour} label="Hours" icon={Clock} status={comp.status} isDark={isDark} isHours />}
                            {hasDayLimit && <CycleProgressBar current={comp.current_days} limit={comp.limit_day} label="Days" icon={CalendarDays} status={comp.status} isDark={isDark} />}
                          </div>
                          {(hasFlightLimit || hasHourLimit) && (
                            <div className={cn("rounded-lg border p-3", isDark ? "border-white/[0.04] bg-slate-800/40" : "border-slate-100 bg-slate-50/80")}>
                              <p className={cn("text-[10px] uppercase tracking-wider font-medium mb-2", isDark ? "text-slate-500" : "text-slate-400")}>Add Usage</p>
                              <div className="flex flex-wrap gap-3">
                                {hasFlightLimit && (
                                  <div className="flex items-center gap-2">
                                    <span className={cn("text-[10px] font-medium w-10", isDark ? "text-slate-400" : "text-slate-500")}>Flights</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setInputs((prev) => ({
                                          ...prev,
                                          [comp.component_id]: { ...prev[comp.component_id], add_flights: prev[comp.component_id]?.add_flights === 1 ? 0 : 1 },
                                        }))
                                      }
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
                                    <span className={cn("text-[10px] font-medium w-10", isDark ? "text-slate-400" : "text-slate-500")}>Hours</span>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={hoursRaw[comp.component_id] ?? ""}
                                        onChange={(e) => handleHoursChange(comp.component_id, e.target.value)}
                                        className={cn(
                                          "h-7 w-20 rounded-md text-xs font-semibold border transition-colors text-center tabular-nums outline-none",
                                          isDark
                                            ? "border-slate-600 bg-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
                                            : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
                                        )}
                                      />
                                    </div>
                                    <span className={cn("text-[9px] uppercase tracking-wider", isDark ? "text-slate-600" : "text-slate-400")}>h.min</span>
                                    {inp?.add_hours > 0 && (
                                      <>
                                        <span className={cn("text-[10px] tabular-nums", isDark ? "text-slate-400" : "text-slate-500")}>
                                          {formatHhmmHours(comp.current_hours)} → {formatHhmmHours(previewHours)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setInputs((prev) => ({ ...prev, [comp.component_id]: { ...prev[comp.component_id], add_hours: 0 } }));
                                            setHoursRaw((prev) => ({ ...prev, [comp.component_id]: "" }));
                                          }}
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
                                  Days are tracked automatically from the last maintenance date.
                                </p>
                              )}
                            </div>
                          )}
                          {comp.status === "DUE" && (
                            <div className={cn("mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]", isDark ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-600 border border-rose-200")}>
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>Maintenance is overdue — schedule maintenance soon</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "logs" && (
            <div className="space-y-5">

              {loadingLogs ? (
                <div className="space-y-2">
                  {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : logs.length > 0 ? (
                <div>
                  <p className={cn("text-xs font-semibold uppercase tracking-wider mb-2", isDark ? "text-slate-500" : "text-slate-400")}>
                    Attached Logs
                  </p>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.log_id}
                        className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", isDark ? "border-white/[0.06] bg-slate-900/40" : "border-slate-200 bg-white")}
                      >
                        <div className={cn("h-7 w-7 rounded flex items-center justify-center shrink-0", isDark ? "bg-slate-700" : "bg-slate-100")}>
                          {log.log_source === "flytbase"
                            ? <Zap className={cn("h-3.5 w-3.5", isDark ? "text-violet-400" : "text-violet-600")} />
                            : <FileUp className={cn("h-3.5 w-3.5", isDark ? "text-slate-400" : "text-slate-500")} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-medium truncate", isDark ? "text-slate-200" : "text-slate-700")}>
                            {log.original_filename}
                          </p>
                          <p className={cn("text-[10px]", isDark ? "text-slate-500" : "text-slate-400")}>
                            {log.log_source === "flytbase" ? "FlytBase" : "Manual"} · {new Date(log.uploaded_at).toLocaleString()}
                          </p>
                        </div>
                        <a href={log.download_url} target="_blank" rel="noopener noreferrer" title="Download">
                          <Download className={cn("h-4 w-4 transition-colors", isDark ? "text-slate-500 hover:text-violet-400" : "text-slate-400 hover:text-violet-600")} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className={cn("text-xs text-center py-3", isDark ? "text-slate-600" : "text-slate-400")}>
                  No flight logs attached yet.
                </p>
              )}

              <div className={cn("h-px", isDark ? "bg-white/[0.06]" : "bg-slate-100")} />

              <div>
                <p className={cn("text-xs font-semibold uppercase tracking-wider mb-3", isDark ? "text-slate-500" : "text-slate-400")}>
                  Manual Upload
                </p>
                <input ref={fileInputRef} type="file" accept=".zip,.json,.xml,.gutma" className="hidden" onChange={handleFileChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 text-sm font-medium transition-colors",
                    uploading
                      ? isDark ? "border-slate-700 text-slate-600 cursor-not-allowed" : "border-slate-200 text-slate-400 cursor-not-allowed"
                      : isDark
                        ? "border-slate-700 text-slate-400 hover:border-violet-500/40 hover:text-violet-400"
                        : "border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
                  )}
                >
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                    : <><FileUp className="h-4 w-4" /> Choose GUTMA file (.zip, .json, .xml)</>
                  }
                </button>
              </div>

              <div className={cn("h-px", isDark ? "bg-white/[0.06]" : "bg-slate-100")} />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className={cn("h-3.5 w-3.5", isDark ? "text-violet-400" : "text-violet-600")} />
                  <p className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>
                    Fetch from FlytBase
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("flex rounded-lg border overflow-hidden", isDark ? "border-slate-700" : "border-slate-200")}>
                    {TIME_WINDOWS.map((w) => (
                      <button
                        key={w.minutes}
                        type="button"
                        onClick={() => { setFbWindow(w.minutes); setFlights([]); setSelectedFlight(null); setFlightsError(null); }}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium transition-colors",
                          fbWindow === w.minutes
                            ? isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-50 text-violet-700"
                            : isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFetchFlights}
                    disabled={loadingFlights}
                    className={cn("h-8 gap-1.5", isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "")}
                  >
                    {loadingFlights ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Fetch Flights
                  </Button>
                </div>

                {flightsError && (
                  <div className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-3 mt-2",
                    isDark ? "bg-red-950/20 border-red-800/30" : "bg-red-50 border-red-200"
                  )}>
                    <svg className={cn("w-4 h-4 mt-0.5 shrink-0", isDark ? "text-red-400" : "text-red-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p className={cn("text-xs", isDark ? "text-red-300" : "text-red-700")}>{flightsError}</p>
                  </div>
                )}

                {flights.length > 0 && (
                  <div className="space-y-1.5">
                    {flights.map((f) => (
                      <button
                        key={f.flight_id}
                        type="button"
                        onClick={() => setSelectedFlight(f.flight_id === selectedFlight ? null : f.flight_id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          selectedFlight === f.flight_id
                            ? isDark ? "border-violet-500/40 bg-violet-500/10" : "border-violet-300 bg-violet-50"
                            : isDark ? "border-white/[0.06] bg-slate-900/40 hover:bg-slate-900/60" : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                            {f.flight_name || f.flight_id}
                          </p>
                        </div>
                        {selectedFlight === f.flight_id && (
                          <CheckCircle2 className={cn("h-4 w-4 shrink-0", isDark ? "text-violet-400" : "text-violet-600")} />
                        )}
                      </button>
                    ))}

                    <Button
                      onClick={handleAttachFlight}
                      disabled={!selectedFlight || attachingFlight}
                      className="w-full mt-2 h-9 bg-violet-600 hover:bg-violet-500 text-white text-sm"
                    >
                      {attachingFlight ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Attaching…</> : "Attach Selected Flight Log"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={cn("flex items-center justify-between gap-2 px-6 py-4 border-t", isDark ? "border-white/[0.06] bg-slate-900/30" : "border-slate-200 bg-slate-50")}>
          {onSkip ? (
            <div className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px]", isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200")}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Update maintenance to complete mission</span>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onSkip ?? onClose}
              className={cn(
                "h-9 px-4 text-sm cursor-pointer",
                onSkip
                  ? isDark ? "border-amber-500/40 text-amber-400 hover:bg-amber-500/10" : "border-amber-300 text-amber-600 hover:bg-amber-50"
                  : isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""
              )}
            >
              {onSkip ? "Back to In Progress" : "Close"}
            </Button>
            <Button
              onClick={handleSubmitMaintenance}
              disabled={submitting || loadingMaint || !hasComponents}
              className="h-9 cursor-pointer px-4 text-sm bg-violet-600 hover:bg-violet-500 text-white"
            >
              {submitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Updating…</> : "Update Maintenance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
