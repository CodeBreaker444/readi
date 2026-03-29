'use client';

import { GutmaPreviewPanel } from '@/components/flytbase/GutmaPreviewPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import JSZip from 'jszip';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  HiChevronRight,
  HiClock,
  HiExclamationCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiRefresh,
} from 'react-icons/hi';
import { toast } from 'sonner';

interface Flight {
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

const WINDOWS = [
  { label: 'Last 1 hr', value: 60 },
  { label: 'Last 6 hrs', value: 360 },
  { label: 'Last 12 hrs', value: 720 },
  { label: 'Last 24 hrs', value: 1440 },
];

function formatMs(ms?: number): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(secs?: number): string {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDistance(m?: number): string {
  if (m == null) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export default function FlytbaseFlightsPage() {
  const { isDark } = useTheme();
  const [window, setWindow] = useState(1440);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);

  const fetchFlights = useCallback(async (win: number) => {
    setLoading(true);
    setError(null);
    setSelectedFlight(null);
    setPreview(null);
    try {
      const res = await axios.get(`/api/flytbase/flights?window=${win}`);
      setFlights(res.data.flights ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to load flights.';
      setError(msg);
      if (err?.response?.status === 422) {
        setError('no_token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights(window);
  }, [fetchFlights, window]);

  async function handleSelectFlight(flight: Flight) {
    if (selectedFlight?.flight_id === flight.flight_id) return;
    setSelectedFlight(flight);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/flytbase/flights/preview?flightId=${encodeURIComponent(flight.flight_id)}`,
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Server error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let presignedUrl: string | null = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.error) throw new Error(payload.message ?? 'FlytBase error');
          if (payload.done) { presignedUrl = payload.url; break outer; }
        }
      }

      if (!presignedUrl) throw new Error('No presigned URL received from server.');

      const zipRes = await fetch(presignedUrl);
      if (!zipRes.ok) throw new Error(`Failed to download GUTMA archive (${zipRes.status})`);
      const zip = await JSZip.loadAsync(await zipRes.arrayBuffer());

      const jsonFile = Object.values(zip.files).find(
        (f) => !f.dir && f.name.toLowerCase().endsWith('.json'),
      );
      if (!jsonFile) throw new Error('No GUTMA JSON found in the downloaded archive.');

      const jsonText = await jsonFile.async('string');
      const gutma = JSON.parse(jsonText);

      setPreview(parseGutmaClient(flight.flight_id, jsonFile.name, gutma));
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load flight log.');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function parseGutmaClient(flightId: string, filename: string, gutma: any) {
    const flightData = gutma?.exchange?.message?.flight_data ?? {};

    const waypointItems: any[] = flightData?.flight_logging?.flight_logging_items ?? [];
    const waypoints = waypointItems.slice(0, 200).map((w: any) => ({
      timestamp: w.timestamp ?? undefined,
      latitude: w.lat ?? w.latitude ?? w.y ?? undefined,
      longitude: w.lon ?? w.longitude ?? w.x ?? undefined,
      altitude: w.altitude ?? undefined,
      speed: w.speed ?? undefined,
      heading: w.heading ?? undefined,
    }));

    return {
      flight_id: flightId,
      raw_filename: filename,
      aircraft: flightData?.aircraft ?? {},
      gcs: flightData?.gcs ?? {},
      waypoints,
      total_waypoints: waypointItems.length,
      start_time: flightData?.start_time ?? gutma?.exchange?.message?.start_time,
      end_time: flightData?.end_time ?? gutma?.exchange?.message?.end_time,
    };
  }

  const bg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';
  const rowSelected = isDark ? 'bg-violet-950/40 border-l-2 border-violet-500' : 'bg-violet-50 border-l-2 border-violet-500';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bg}`}>
      <div className="animate-in fade-in duration-700">
        <div className={`backdrop-blur-md w-full ${isDark ? 'bg-slate-900/80 border-b border-slate-800' : 'bg-white/80 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'} px-6 py-4 mb-6`}>
          <div className="mx-auto max-w-[1800px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-violet-600" />
              <div>
                <h1 className={`font-semibold text-base tracking-tight ${textPrimary}`}>
                  Recent Flights
                </h1>
                <p className={`text-xs ${textSecondary}`}>
                  Select a flight to preview its GUTMA log
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pointer-events-none opacity-50">
              <div className="flex items-center gap-1">
                {WINDOWS.map((w) => (
                  <button
                    key={w.value}
                    disabled
                    className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                      window === w.value
                        ? 'bg-violet-600 text-white'
                        : isDark
                        ? 'text-slate-400 bg-slate-800'
                        : 'text-slate-500 bg-slate-100'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled
                className={`h-8 gap-1.5 text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}`}
              >
                <HiRefresh className="h-3.5 w-3.5" />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled
                className={`h-8 text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}`}
              >
                Settings
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 max-w-[1800px] mx-auto">
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-6 ${
              isDark
                ? 'bg-amber-950/20 border-amber-800/30'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <HiOutlineClock
              className={`w-4 h-4 shrink-0 ${
                isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            />
            <p
              className={`text-xs font-medium ${
                isDark ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              FlytBase integration is coming soon. This is a preview of the
              interface — buttons are not active yet.
            </p>
            <span
              className={`ml-auto shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                isDark
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              Coming Soon
            </span>
          </div>

          <div className="pointer-events-none opacity-50 select-none">
          {error === 'no_token' && (
            <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 mb-6 ${isDark ? 'bg-violet-950/20 border-violet-800/30' : 'bg-violet-50 border-violet-200'}`}>
              <div className="flex items-center gap-3">
                <HiExclamationCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                <p className={`text-xs font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                  No FlytBase API token configured for your account.
                </p>
              </div>
              <Link href="/flytbase">
                <Button size="sm" className="h-7 text-xs shrink-0 bg-violet-600 hover:bg-violet-500 text-white">
                  Set up now
                </Button>
              </Link>
            </div>
          )}

          {error && error !== 'no_token' && (
            <div className={`flex items-start gap-3 rounded-xl border p-4 mb-6 ${isDark ? 'bg-red-950/20 border-red-800/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <HiExclamationCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <div className={`rounded-xl border flex-shrink-0 w-full max-w-sm ${card}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}">
                <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Flights
                </span>
                {!loading && (
                  <span className={`text-[11px] font-mono ${textSecondary}`}>
                    {flights.length} shown{total > flights.length ? ` of ${total}` : ''}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-800/50">
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 space-y-1.5">
                    <Skeleton className={`h-3 w-2/3 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <Skeleton className={`h-2.5 w-1/2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  </div>
                ))}

                {!loading && !error && flights.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <HiClock className={`w-6 h-6 mx-auto mb-2 ${textSecondary}`} />
                    <p className={`text-xs ${textSecondary}`}>
                      No flights found in the last {window} minutes.
                    </p>
                  </div>
                )}

                {!loading && flights.map((flight) => {
                  const isSelected = selectedFlight?.flight_id === flight.flight_id;
                  return (
                    <button
                      key={flight.flight_id}
                      onClick={() => handleSelectFlight(flight)}
                      className={`w-full text-left px-4 py-3 transition-colors ${rowHover} ${isSelected ? rowSelected : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium truncate ${textPrimary}`}>
                            {flight.flight_name ?? flight.flight_id}
                          </p>
                          {(flight.drone_name || flight.mission_name) && (
                            <p className={`text-[11px] truncate mt-0.5 ${textSecondary}`}>
                              {[flight.drone_name, flight.mission_name].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <div className={`flex items-center gap-2 mt-1 text-[10px] ${textSecondary}`}>
                            {flight.start_time && (
                              <span className="flex items-center gap-1">
                                <HiClock className="w-3 h-3" />
                                {formatMs(flight.start_time)}
                              </span>
                            )}
                            {flight.duration != null && (
                              <span>{formatDuration(flight.duration)}</span>
                            )}
                            {flight.distance != null && (
                              <span>{formatDistance(flight.distance)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {flight.status && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                              {flight.status}
                            </Badge>
                          )}
                          <HiChevronRight className={`w-3.5 h-3.5 ${textSecondary}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {!selectedFlight && !loading && (
                <div className={`rounded-xl border h-64 flex flex-col items-center justify-center gap-3 ${card}`}>
                  <HiOutlineDocumentText className={`w-8 h-8 ${textSecondary}`} />
                  <p className={`text-xs ${textSecondary}`}>Select a flight to preview its GUTMA log</p>
                </div>
              )}

              {selectedFlight && (
                <GutmaPreviewPanel
                  flight={selectedFlight}
                  preview={preview}
                  loading={previewLoading}
                  isDark={isDark}
                />
              )}
            </div>
          </div>
          </div>  
        </div>
      </div>
    </div>
  );
}
