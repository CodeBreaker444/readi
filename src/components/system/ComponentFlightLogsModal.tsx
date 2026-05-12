'use client';

import { GutmaPreviewPanel } from '@/components/control-center/GutmaPreviewPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import { useEffect, useState } from 'react';
import { HiArrowLeft, HiClock, HiOutlineDocumentText } from 'react-icons/hi';

interface FlightLogEntry {
  log_id: number;
  mission_id: number;
  mission_code: string | null;
  log_source: string;
  original_filename: string;
  flytbase_flight_id: string | null;
  uploaded_at: string;
  flight_duration: number | null;
  distance_flown: number | null;
  actual_start: string | null;
  actual_end: string | null;
}

function formatDuration(mins?: number | null): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(meters?: number | null): string {
  if (meters == null) return '—';
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  componentId: number | null;
  componentLabel: string;
}

export function ComponentFlightLogsModal({ open, onClose, componentId, componentLabel }: Props) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<FlightLogEntry[]>([]);
  const [selected, setSelected] = useState<FlightLogEntry | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'preview'>('list');

  useEffect(() => {
    if (!open || !componentId) return;
    setLoading(true);
    setSelected(null);
    setPreview(null);
    setPreviewError(null);
    setMobileView('list');
    fetch(`/api/system/component/${componentId}/flight-logs`)
      .then((r) => r.json())
      .then((body) => {
        if (body.code === 1) setLogs(body.data ?? []);
        else setLogs([]);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [open, componentId]);

  async function handleSelect(log: FlightLogEntry) {
    setSelected(log);
    setPreview(null);
    setPreviewError(null);
    setMobileView('preview');

    if (!log.flytbase_flight_id) return;

    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/flytbase/flights/preview?flightId=${encodeURIComponent(log.flytbase_flight_id)}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message ?? `Error ${res.status}`);
      setPreview(body.data);
    } catch (err: any) {
      setPreviewError(err?.message ?? 'Failed to load flight log.');
    } finally {
      setPreviewLoading(false);
    }
  }

  const bg = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const headerBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const divider = isDark ? 'divide-slate-800/60' : 'divide-slate-100';
  const rowHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';
  const rowSelected = isDark
    ? 'bg-violet-950/40 border-l-2 border-violet-500'
    : 'bg-violet-50 border-l-2 border-violet-500';

  const selectedFlight = selected?.flytbase_flight_id
    ? {
      flight_id: selected.flytbase_flight_id,
      flight_name: selected.mission_code ?? selected.original_filename,
      start_time: selected.actual_start ? new Date(selected.actual_start).getTime() : undefined,
      end_time: selected.actual_end ? new Date(selected.actual_end).getTime() : undefined,
      duration: selected.flight_duration != null ? selected.flight_duration * 60 : undefined,
      distance: selected.distance_flown ?? undefined,
    }
    : null;

  const PreviewContent = (
    <>
      {!selected && (
        <div className={`rounded-xl border flex flex-col items-center justify-center gap-3 py-20 ${card}`}>
          <HiOutlineDocumentText className={`w-10 h-10 ${textSecondary}`} />
          <p className={`text-sm ${textSecondary}`}>Select a flight log to view details.</p>
        </div>
      )}

      {selected && !selected.flytbase_flight_id && (
        <div className={`rounded-xl border flex flex-col items-center justify-center gap-4 px-6 py-20 ${card}`}>
          <HiOutlineDocumentText className={`w-10 h-10 ${textSecondary}`} />
          <div className="text-center space-y-2">
            <p className={`text-base font-semibold ${textPrimary}`}>
              {selected.mission_code ?? `Mission #${selected.mission_id}`}
            </p>
            <p className={`text-sm ${textSecondary}`}>
              Manual upload — no Control Center preview available.
            </p>
            <div className={`flex items-center justify-center gap-6 pt-2 text-sm ${textSecondary}`}>
              {selected.flight_duration != null && (
                <div className="text-center">
                  <p className={`text-[10px] uppercase tracking-wide font-semibold mb-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Duration</p>
                  <p className="font-medium">{formatDuration(selected.flight_duration)}</p>
                </div>
              )}
              {selected.distance_flown != null && (
                <div className="text-center">
                  <p className={`text-[10px] uppercase tracking-wide font-semibold mb-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Distance</p>
                  <p className="font-medium">{formatDistance(selected.distance_flown)}</p>
                </div>
              )}
            </div>
            <p className={`text-xs pt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {selected.original_filename}
            </p>
          </div>
        </div>
      )}

      {selected && selected.flytbase_flight_id && selectedFlight && (
        <GutmaPreviewPanel
          flight={selectedFlight}
          preview={preview}
          loading={previewLoading}
          isDark={isDark}
          previewError={previewError}
        />
      )}
    </>
  );

  const LogList = (
    <div className={`flex flex-col flex-1 min-h-0 rounded-xl border overflow-hidden ${card}`}>
      <div className={`px-4 py-3 border-b shrink-0 flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <span className={`text-xs font-semibold uppercase tracking-widest ${textSecondary}`}>
          Flight Logs
        </span>
        <span className={`text-[11px] font-mono ${textSecondary}`}>
          {loading ? '…' : `${logs.length} record${logs.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto divide-y ${divider}`}>
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 space-y-2">
              <Skeleton className={`h-3 w-2/3 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <Skeleton className={`h-2.5 w-1/2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <Skeleton className={`h-2.5 w-3/4 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            </div>
          ))}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <HiOutlineDocumentText className={`w-8 h-8 ${textSecondary}`} />
            <p className={`text-xs text-center ${textSecondary}`}>
              No flight logs found<br />for this component.
            </p>
          </div>
        )}

        {!loading &&
          logs.map((log) => {
            const isSelected = selected?.log_id === log.log_id;
            return (
              <button
                key={log.log_id}
                onClick={() => handleSelect(log)}
                className={`w-full text-left px-4 py-3.5 transition-colors ${rowHover} ${isSelected ? rowSelected : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate leading-tight ${textPrimary}`}>
                      {log.mission_code ?? `Mission #${log.mission_id}`}
                    </p>
                    <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {log.original_filename}
                    </p>
                    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1.5 text-[11px] ${textSecondary}`}>
                      {log.actual_start && (
                        <span className="flex items-center gap-1">
                          <HiClock className="w-3 h-3 shrink-0" />
                          {new Date(log.actual_start).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      {log.flight_duration != null && (
                        <span className="font-medium">{formatDuration(log.flight_duration)}</span>
                      )}
                      {log.distance_flown != null && (
                        <span>{formatDistance(log.distance_flown)}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${log.log_source === 'flytbase'
                        ? isDark
                          ? 'bg-violet-900/50 text-violet-300'
                          : 'bg-violet-100 text-violet-700'
                        : isDark
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    {log.log_source === 'flytbase' ? 'Control Center' : 'Manual'}
                  </span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className={`w-full max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] h-[92vh] flex flex-col overflow-hidden p-0 ${isDark ? `${bg} border-slate-700` : bg}`}
      >
        <DialogHeader className={`px-5 sm:px-7 pt-5 pb-4 border-b shrink-0 ${headerBorder} ${isDark ? bg : 'bg-white'}`}>
          <div className="flex items-center gap-3 mr-8">
            <div className="w-1 h-6 rounded-full bg-violet-600 shrink-0" />
            <div className="min-w-0">
              <DialogTitle className={`text-base font-semibold leading-tight ${textPrimary}`}>
                Flight Logs
              </DialogTitle>
              <p className={`text-xs mt-0.5 truncate ${textSecondary}`}>{componentLabel}</p>
            </div>
          </div>
        </DialogHeader>

        <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${bg}`}>
          <div className="hidden md:flex flex-1 min-h-0 gap-5 p-5">
            <div className="w-72 lg:w-80 shrink-0 flex flex-col min-h-0">
              {LogList}
            </div>
            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
              {PreviewContent}
            </div>
          </div>

          <div className="flex md:hidden flex-col flex-1 min-h-0 p-4">
            {mobileView === 'list' ? (
              LogList
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <button
                  onClick={() => setMobileView('list')}
                  className={`flex items-center gap-1.5 mb-3 shrink-0 text-xs font-medium w-fit ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <HiArrowLeft className="w-3.5 h-3.5" />
                  Back to logs
                </button>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {PreviewContent}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}