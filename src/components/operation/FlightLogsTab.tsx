"use client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
 
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    Clock,
    Download,
    FileUp,
    Loader2,
    RefreshCw,
    Zap
} from "lucide-react";
import { Skeleton } from "../ui/skeleton";

 
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
 

const TIME_WINDOWS = [
  { key: "1hr",  minutes: 60 },
  { key: "6hrs", minutes: 360 },
  { key: "12hrs", minutes: 720 },
  { key: "24hrs", minutes: 1440 },
] as const;



function formatDuration(sec?: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDistance(m?: number): string {
  if (m == null) return "—";
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
interface FlightLogsTabProps {
  logs: FlightLog[];
  loadingLogs: boolean;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fbWindow: number;
  loadingFlights: boolean;
  flights: FlytbaseFlight[];
  selectedFlight: string | null;
  attachingFlight: boolean;
  autoSyncingFlight: boolean;
  flightsError: string | null;
  isDark: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWindowChange: (minutes: number) => void;
  onFetchFlights: () => void;
  onSelectFlight: (id: string) => void;
  onAttachFlight: () => void;
}

export function FlightLogsTab({
  logs,
  loadingLogs,
  uploading,
  fileInputRef,
  fbWindow,
  loadingFlights,
  flights,
  selectedFlight,
  attachingFlight,
  autoSyncingFlight,
  flightsError,
  isDark,
  onFileChange,
  onWindowChange,
  onFetchFlights,
  onSelectFlight,
  onAttachFlight,
}: FlightLogsTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* Attached logs */}
      {loadingLogs ? (
        <div className="space-y-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : logs.length > 0 ? (
        <div>
          <p className={cn("text-xs font-semibold uppercase tracking-wider mb-2", isDark ? "text-slate-500" : "text-slate-400")}>
            {t("operations.missionComplete.logs.attachedLogs")}
          </p>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.log_id}
                className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", isDark ? "border-white/6 bg-slate-900/40" : "border-slate-200 bg-white")}
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
                    {log.log_source === "flytbase"
                      ? t("operations.missionComplete.logs.sourceFlytbase")
                      : t("operations.missionComplete.logs.sourceManual")
                    } · {new Date(log.uploaded_at).toLocaleString()}
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
          {t("operations.missionComplete.logs.noLogs")}
        </p>
      )}

      <div className={cn("h-px", isDark ? "bg-white/6" : "bg-slate-100")} />

      {/* Manual upload */}
      <div>
        <p className={cn("text-xs font-semibold uppercase tracking-wider mb-3", isDark ? "text-slate-500" : "text-slate-400")}>
          {t("operations.missionComplete.logs.manualUpload")}
        </p>
        <input ref={fileInputRef} type="file" accept=".zip,.json,.xml,.gutma" className="hidden" onChange={onFileChange} />
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
            ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("operations.missionComplete.logs.uploading")}</>
            : <><FileUp className="h-4 w-4" /> {t("operations.missionComplete.logs.chooseFile")}</>
          }
        </button>
      </div>

      <div className={cn("h-px", isDark ? "bg-white/6" : "bg-slate-100")} />

      {/* FlytBase fetch */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className={cn("h-3.5 w-3.5", isDark ? "text-violet-400" : "text-violet-600")} />
          <p className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>
            {t("operations.missionComplete.logs.fetchFromFlytbase")}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className={cn("flex rounded-lg border overflow-hidden", isDark ? "border-slate-700" : "border-slate-200")}>
            {TIME_WINDOWS.map((w) => (
              <button
                key={w.minutes}
                type="button"
                onClick={() => onWindowChange(w.minutes)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  fbWindow === w.minutes
                    ? isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-50 text-violet-700"
                    : isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {t(`operations.missionComplete.logs.timeWindows.${w.key}`)}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onFetchFlights}
            disabled={loadingFlights}
            className={cn("h-8 gap-1.5", isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "")}
          >
            {loadingFlights ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t("operations.missionComplete.logs.fetchFlights")}
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
          <div className="space-y-2 mt-1">
            <div className={cn(
              "rounded-xl border overflow-hidden divide-y",
              isDark ? "border-slate-800 divide-slate-800/60" : "border-slate-200 divide-slate-100"
            )}>
              {flights.map((f) => {
                const isSelected = selectedFlight === f.flight_id;
                return (
                  <button
                    key={f.flight_id}
                    type="button"
                    onClick={() => onSelectFlight(f.flight_id)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors",
                      isSelected
                        ? isDark
                          ? "bg-violet-950/40 border-l-2 border-violet-500"
                          : "bg-violet-50 border-l-2 border-violet-500"
                        : isDark
                          ? "hover:bg-slate-800/50"
                          : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-medium truncate", isDark ? "text-white" : "text-slate-900")}>
                          {f.flight_name ?? f.flight_id}
                        </p>
                        <p className={cn("text-[10px] font-mono truncate mt-0.5", isDark ? "text-slate-600" : "text-slate-400")}>
                          {f.flight_id}
                        </p>
                        {f.drone_name && (
                          <p className={cn("text-[11px] font-medium truncate mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
                            {f.drone_name}
                          </p>
                        )}
                        <div className={cn("flex items-center gap-2 mt-1 text-[10px] flex-wrap", isDark ? "text-slate-500" : "text-slate-400")}>
                          {f.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(f.start_time).toLocaleString([], {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          )}
                          {f.duration != null && <span>{formatDuration(f.duration)}</span>}
                          {f.distance != null && <span>{formatDistance(f.distance)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {f.status && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0 rounded border",
                            isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"
                          )}>
                            {f.status}
                          </span>
                        )}
                        {isSelected
                          ? <CheckCircle2 className={cn("h-4 w-4", isDark ? "text-violet-400" : "text-violet-600")} />
                          : <svg className={cn("h-3.5 w-3.5", isDark ? "text-slate-500" : "text-slate-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        }
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={onAttachFlight}
              disabled={!selectedFlight || attachingFlight || autoSyncingFlight}
              className="w-full h-9 bg-violet-600 hover:bg-violet-500 text-white text-sm"
            >
              {attachingFlight
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("operations.missionComplete.logs.attaching")}</>
                : autoSyncingFlight
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("operations.missionComplete.logs.syncingGutma")}</>
                  : t("operations.missionComplete.logs.attachFlight")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}