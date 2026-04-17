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
  FileUp,
  Loader2,
  Wrench
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FlightLogsTab } from "./FlightLogsTab";
import { MaintenanceTab } from "./MaintenanceTab";


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


export function MissionCompleteModal({ open, onClose, onSkip, toolId, missionId, isDark }: Props) {
  const { t } = useTranslation();
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
  const [autoSyncingFlight, setAutoSyncingFlight] = useState(false);
  const [autoSyncedIds, setAutoSyncedIds] = useState<Set<number>>(new Set());

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

  const ALLOWED_EXTENSIONS = ['.zip', '.json', '.xml', '.gutma'];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(t("operations.missionComplete.toast.invalidFileType", { types: ALLOWED_EXTENSIONS.join(', ') }));
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

        // Auto-sync GUTMA data into maintenance inputs
        const flightId = selectedFlight;
        setAutoSyncingFlight(true);
        try {
          const { data: previewRes } = await axios.get(
            `/api/flytbase/flights/preview?flightId=${flightId}`
          );
          if (previewRes.success && previewRes.data && systemData) {
            const preview = previewRes.data;

            let durationHhmm = 0;
            if (preview.start_time && preview.end_time) {
              const start = new Date(preview.start_time).getTime();
              const end = new Date(preview.end_time).getTime();
              if (!isNaN(start) && !isNaN(end) && end > start) {
                durationHhmm = secondsToHhmm(Math.round((end - start) / 1000));
              }
            }

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

            if (newSyncedIds.size > 0) {
              toast.success(t("operations.missionComplete.toast.autoSyncSuccess", { count: newSyncedIds.size }));
              setActiveTab("maintenance");
            }
          }
        } catch {
          // GUTMA auto-sync is best-effort — don't surface error to user
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
            {(["maintenance", "logs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab
                    ? isDark ? "border-violet-400 text-violet-400" : "border-violet-600 text-violet-600"
                    : isDark ? "border-transparent text-slate-500 hover:text-slate-300" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab === "maintenance" ? <Wrench className="h-3.5 w-3.5" /> : <FileUp className="h-3.5 w-3.5" />}
                {tab === "maintenance"
                  ? t("operations.missionComplete.tabs.maintenance")
                  : t("operations.missionComplete.tabs.flightLogs")
                }
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
