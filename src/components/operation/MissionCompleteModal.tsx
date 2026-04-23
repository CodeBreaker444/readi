"use client";

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
  CheckCircle2,
  ClipboardList,
  FileUp,
  Loader2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlightLogsTab } from "./FlightLogsTab";
import { MaintenanceTab } from "./MaintenanceTab";
import { PostFlightTab, type MissionResultOption, type PostFlightState } from "./PostFlightTab";


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
  mission_name?: string;
  status?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSkip?: () => void;
  toolId: number;
  missionId: number;
  isDark: boolean;
}


function hhmmToMinutes(hhmm: number): number {
  const h = Math.floor(hhmm);
  const m = Math.round((hhmm - h) * 100);
  return h * 60 + m;
}

function secondsToHhmm(seconds: number): number {
  if (seconds <= 0) return 0;
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h + m / 100;
}

/** Convert an ISO timestamp to the "YYYY-MM-DDTHH:MM" format for datetime-local inputs */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    // Use local time representation
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}


export function MissionCompleteModal({ open, onClose, onSkip, toolId, missionId, isDark }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"maintenance" | "logs" | "postFlight">("maintenance");

  // Maintenance state
  const [loadingMaint, setLoadingMaint] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [inputs, setInputs] = useState<Record<number, ComponentInput>>({});
  const [hoursRaw, setHoursRaw] = useState<Record<number, string>>({});

  // Logs state
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
  const [autoSyncingFlight, setAutoSyncingFlight] = useState(false);
  const [autoSyncedIds, setAutoSyncedIds] = useState<Set<number>>(new Set());

  // Post-flight state
  const [loadingPostFlight, setLoadingPostFlight] = useState(true);
  const [submittingPostFlight, setSubmittingPostFlight] = useState(false);
  const [resultOptions, setResultOptions] = useState<MissionResultOption[]>([]);
  const [postFlightFromLog, setPostFlightFromLog] = useState(false);
  const [postFlight, setPostFlight] = useState<PostFlightState>({
    actual_end: "",
    result_id: null,
    flight_duration_min: "",
    distance_m: "",
    battery_charge_start: "",
    battery_charge_end: "",
    incident_flag: false,
    rth_unplanned: false,
    link_loss: false,
    deviation_flag: false,
    weather_temp: "",
    notes: "",
  });

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
      toast.error(e.response?.data?.message ?? t("operations.missionComplete.toast.loadError"));
    } finally {
      setLoadingMaint(false);
    }
  }, [toolId, t]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data } = await axios.get(`/api/operation/board/flight-logs?mission_id=${missionId}`);
      if (data.code === 1) setLogs(data.data ?? []);
    } catch (err) {
      console.log("Error in Fetching logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }, [missionId]);

  const loadPostFlight = useCallback(async () => {
    setLoadingPostFlight(true);
    try {
      const { data } = await axios.get(`/api/operation/board/post-flight?mission_id=${missionId}`);
      if (data.code === 1 && data.data) {
        const { flight, result_options } = data.data;
        setResultOptions(result_options ?? []);
        setPostFlight({
          actual_end: isoToLocalInput(flight?.actual_end),
          result_id: flight?.fk_mission_result_type_id ?? null,
          flight_duration_min: flight?.flight_duration != null ? String(flight.flight_duration) : "",
          distance_m: flight?.distance_flown != null ? String(flight.distance_flown) : "",
          battery_charge_start: flight?.battery_charge_start != null ? String(flight.battery_charge_start) : "",
          battery_charge_end: flight?.battery_charge_end != null ? String(flight.battery_charge_end) : "",
          incident_flag: flight?.incident_flag ?? false,
          rth_unplanned: flight?.rth_unplanned ?? false,
          link_loss: flight?.link_loss ?? false,
          deviation_flag: flight?.deviation_flag ?? false,
          weather_temp: flight?.weather_temperature != null ? String(flight.weather_temperature) : "",
          notes: flight?.notes ?? "",
        });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? t("operations.missionComplete.toast.loadError"));
    } finally {
      setLoadingPostFlight(false);
    }
  }, [missionId, t]);

  useEffect(() => {
    if (open && toolId > 0) {
      loadMaintenance();
      loadLogs();
      loadPostFlight();
    }
  }, [open, toolId, loadMaintenance, loadLogs, loadPostFlight]);

  // ── Maintenance handlers ─────────────────────────────────────────────────
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

  const handleToggleFlight = (compId: number) => {
    setInputs((prev) => ({
      ...prev,
      [compId]: { ...prev[compId], add_flights: prev[compId]?.add_flights === 1 ? 0 : 1 },
    }));
  };

  const handleResetHours = (compId: number) => {
    setInputs((prev) => ({ ...prev, [compId]: { ...prev[compId], add_hours: 0 } }));
    setHoursRaw((prev) => ({ ...prev, [compId]: "" }));
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
        toast.success(t("operations.missionComplete.toast.updateSuccess"));
        onClose();
      } else {
        toast.error(data.message || t("operations.missionComplete.toast.loadError"));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? t("operations.missionComplete.toast.loadError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Post-flight handlers ─────────────────────────────────────────────────
  const handlePostFlightChange = <K extends keyof PostFlightState>(
    field: K,
    value: PostFlightState[K]
  ) => {
    setPostFlight((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitPostFlight = async () => {
    const payload: Record<string, unknown> = {
      mission_id: missionId,
      flight_duration: postFlight.flight_duration_min ? parseInt(postFlight.flight_duration_min, 10) : null,
      actual_end: postFlight.actual_end ? new Date(postFlight.actual_end).toISOString() : null,
      distance_flown: postFlight.distance_m ? parseFloat(postFlight.distance_m) : null,
      battery_charge_start: postFlight.battery_charge_start ? parseFloat(postFlight.battery_charge_start) : null,
      battery_charge_end: postFlight.battery_charge_end ? parseFloat(postFlight.battery_charge_end) : null,
      incident_flag: postFlight.incident_flag,
      rth_unplanned: postFlight.rth_unplanned,
      link_loss: postFlight.link_loss,
      deviation_flag: postFlight.deviation_flag,
      weather_temperature: postFlight.weather_temp ? parseFloat(postFlight.weather_temp) : null,
      notes: postFlight.notes || null,
      fk_mission_result_type_id: postFlight.result_id,
    };

    setSubmittingPostFlight(true);
    try {
      const { data } = await axios.post("/api/operation/board/post-flight", payload);
      if (data.code === 1) {
        toast.success(t("operations.missionComplete.toast.postFlightSuccess"));
        onClose();
      } else {
        toast.error(data.message || t("operations.missionComplete.toast.loadError"));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? t("operations.missionComplete.toast.loadError"));
    } finally {
      setSubmittingPostFlight(false);
    }
  };

  // ── Logs handlers ────────────────────────────────────────────────────────
  const ALLOWED_EXTENSIONS = [".zip", ".json", ".xml", ".gutma"];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(t("operations.missionComplete.toast.invalidFileType", { types: ALLOWED_EXTENSIONS.join(", ") }));
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("mission_id", String(missionId));
      form.append("file", file);
      const { data } = await axios.post("/api/operation/board/flight-logs/upload", form);
      if (data.code === 1) {
        toast.success(t("operations.missionComplete.toast.uploadSuccess"));
        loadLogs();
      } else {
        toast.error(data.message ?? t("operations.missionComplete.toast.uploadFailed"));
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? t("operations.missionComplete.toast.uploadFailed"));
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
        if ((data.flights ?? []).length === 0) {
          setFlightsError(t("operations.missionComplete.toast.noFlightsFound"));
        }
      } else {
        setFlightsError(data.message ?? t("operations.missionComplete.toast.loadError"));
      }
    } catch (e: any) {
      setFlightsError(e.response?.data?.message ?? t("operations.missionComplete.toast.loadError"));
    } finally {
      setLoadingFlights(false);
    }
  };

  const handleWindowChange = (minutes: number) => {
    setFbWindow(minutes);
    setFlights([]);
    setSelectedFlight(null);
    setFlightsError(null);
  };

  const handleSelectFlight = (id: string) => {
    setSelectedFlight(id === selectedFlight ? null : id);
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
        toast.success(t("operations.missionComplete.toast.attachSuccess"));
        setSelectedFlight(null);
        setFlights([]);
        loadLogs();

        // Auto-sync GUTMA data into maintenance inputs + post-flight fields
        const flightId = selectedFlight;
        setAutoSyncingFlight(true);
        try {
          const { data: previewRes } = await axios.get(
            `/api/flytbase/flights/preview?flightId=${flightId}`
          );
          if (previewRes.success && previewRes.data && systemData) {
            const preview = previewRes.data;

            let durationHhmm = 0;
            let durationSeconds = 0;
            if (preview.start_time && preview.end_time) {
              const start = new Date(preview.start_time).getTime();
              const end = new Date(preview.end_time).getTime();
              if (!isNaN(start) && !isNaN(end) && end > start) {
                durationSeconds = Math.round((end - start) / 1000);
                durationHhmm = secondsToHhmm(durationSeconds);
              }
            }

            // Sync maintenance inputs
            const gutmaSnMap = new Map<string, "aircraft" | "gcs" | "battery">();
            if (preview.aircraft?.serial_number?.trim()) {
              gutmaSnMap.set(preview.aircraft.serial_number.trim(), "aircraft");
            }
            if (preview.gcs?.serial_number?.trim()) {
              gutmaSnMap.set(preview.gcs.serial_number.trim(), "gcs");
            }
            for (const p of preview.payload ?? []) {
              if (p.serial_number?.trim()) {
                gutmaSnMap.set(p.serial_number.trim(), "battery");
              }
            }

            const newSyncedIds = new Set<number>();
            setInputs((prev) => {
              const next = { ...prev };
              for (const comp of systemData.components) {
                if (!comp.serial_number) continue;
                const sn = comp.serial_number.trim();
                if (!gutmaSnMap.has(sn)) continue;
                newSyncedIds.add(comp.component_id);
                const current = next[comp.component_id] ?? { component_id: comp.component_id, add_flights: 0, add_hours: 0 };
                next[comp.component_id] = {
                  ...current,
                  add_flights: comp.limit_flight > 0 ? 1 : current.add_flights,
                  add_hours: comp.limit_hour > 0 && durationHhmm > 0 ? durationHhmm : current.add_hours,
                };
              }
              return next;
            });
            setHoursRaw((prev) => {
              const next = { ...prev };
              for (const comp of systemData.components) {
                if (!comp.serial_number) continue;
                if (!gutmaSnMap.has(comp.serial_number.trim())) continue;
                if (comp.limit_hour > 0 && durationHhmm > 0) {
                  next[comp.component_id] = String(durationHhmm);
                }
              }
              return next;
            });
            setAutoSyncedIds(newSyncedIds);

            // Sync post-flight fields from GUTMA
            const durationTotalMinutes = Math.round(durationSeconds / 60);
            setPostFlight((prev) => ({
              ...prev,
              flight_duration_min: durationTotalMinutes > 0 ? String(durationTotalMinutes) : prev.flight_duration_min,
              actual_end: preview.end_time ? isoToLocalInput(preview.end_time) : prev.actual_end,
            }));
            if (durationTotalMinutes > 0 || preview.end_time) {
              setPostFlightFromLog(true);
            }

            if (newSyncedIds.size > 0) {
              toast.success(t("operations.missionComplete.toast.autoSyncSuccess", { count: newSyncedIds.size }));
              setActiveTab("maintenance");
            }
          }
        } catch {
          // GUTMA auto-sync is best-effort
        } finally {
          setAutoSyncingFlight(false);
        }
      } else {
        setFlightsError(data.message ?? t("operations.missionComplete.toast.loadError"));
      }
    } catch (e: any) {
      setFlightsError(e.response?.data?.message ?? t("operations.missionComplete.toast.loadError"));
    } finally {
      setAttachingFlight(false);
    }
  };

  if (!open) return null;

  const hasComponents = systemData && systemData.components.length > 0;

  const tabs = [
    { key: "maintenance" as const, icon: Wrench, label: t("operations.missionComplete.tabs.maintenance") },
    { key: "logs" as const, icon: FileUp, label: t("operations.missionComplete.tabs.flightLogs"), badge: logs.length > 0 ? logs.length : undefined },
    { key: "postFlight" as const, icon: ClipboardList, label: t("operations.missionComplete.tabs.postFlight") },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) (onSkip ?? onClose)(); }}>
      <DialogContent
        className={cn(
          "max-w-175! w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0",
          isDark ? "bg-[#0f1419] border-white/8" : "bg-white border-slate-200"
        )}
      >
        <DialogHeader
          className={cn(
            "relative overflow-hidden px-6 pt-6 pb-0 shrink-0",
            isDark ? "bg-slate-900/60" : "bg-slate-50"
          )}
        >
          {isDark && (
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-linear-to-bl from-violet-500/10 to-transparent" />
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isDark ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-600")}>
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                {t("operations.missionComplete.title")}
              </DialogTitle>
              {systemData && (
                <p className={cn("mt-0.5 text-[12px]", isDark ? "text-slate-500" : "text-slate-400")}>
                  {systemData.tool_code}{systemData.tool_name ? ` — ${systemData.tool_name}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className={cn("flex border-b", isDark ? "border-white/6" : "border-slate-200")}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key
                    ? isDark ? "border-violet-400 text-violet-400" : "border-violet-600 text-violet-600"
                    : isDark ? "border-transparent text-slate-500 hover:text-slate-300" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.badge != null && (
                  <span className={cn("ml-1 rounded-full px-1.5 py-0 text-[10px] font-semibold", isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700")}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "maintenance" && (
            <MaintenanceTab
              loadingMaint={loadingMaint}
              systemData={systemData}
              inputs={inputs}
              hoursRaw={hoursRaw}
              autoSyncedIds={autoSyncedIds}
              isDark={isDark}
              onToggleFlight={handleToggleFlight}
              onHoursChange={handleHoursChange}
              onResetHours={handleResetHours}
            />
          )}
          {activeTab === "logs" && (
            <FlightLogsTab
              logs={logs}
              loadingLogs={loadingLogs}
              uploading={uploading}
              fileInputRef={fileInputRef}
              fbWindow={fbWindow}
              loadingFlights={loadingFlights}
              flights={flights}
              selectedFlight={selectedFlight}
              attachingFlight={attachingFlight}
              autoSyncingFlight={autoSyncingFlight}
              flightsError={flightsError}
              isDark={isDark}
              onFileChange={handleFileChange}
              onWindowChange={handleWindowChange}
              onFetchFlights={handleFetchFlights}
              onSelectFlight={handleSelectFlight}
              onAttachFlight={handleAttachFlight}
            />
          )}
          {activeTab === "postFlight" && (
            <PostFlightTab
              data={postFlight}
              resultOptions={resultOptions}
              loading={loadingPostFlight}
              fromLog={postFlightFromLog}
              isDark={isDark}
              onChange={handlePostFlightChange}
            />
          )}
        </div>

        <div className={cn("flex items-center justify-between gap-2 px-6 py-4 border-t", isDark ? "border-white/[0.06] bg-slate-900/30" : "border-slate-200 bg-slate-50")}>
          {onSkip ? (
            <div className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px]", isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200")}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{t("operations.missionComplete.footer.updateWarning")}</span>
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
              {onSkip
                ? t("operations.missionComplete.footer.backToInProgress")
                : t("operations.missionComplete.footer.close")
              }
            </Button>

            {activeTab === "maintenance" && (
              <Button
                onClick={handleSubmitMaintenance}
                disabled={submitting || loadingMaint || !hasComponents}
                className="h-9 cursor-pointer px-4 text-sm bg-violet-600 hover:bg-violet-500 text-white"
              >
                {submitting
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> {t("operations.missionComplete.footer.updating")}</>
                  : t("operations.missionComplete.footer.updateMaintenance")
                }
              </Button>
            )}

            {activeTab === "postFlight" && (
              <Button
                onClick={handleSubmitPostFlight}
                disabled={submittingPostFlight || loadingPostFlight}
                className="h-9 cursor-pointer px-4 text-sm bg-violet-600 hover:bg-violet-500 text-white"
              >
                {submittingPostFlight
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> {t("operations.missionComplete.footer.saving")}</>
                  : t("operations.missionComplete.footer.savePostFlight")
                }
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
