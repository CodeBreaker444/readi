'use client';

import { GutmaPreviewPanel } from '@/components/control-center/GutmaPreviewPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    HiChevronRight,
    HiClock,
    HiExclamationCircle,
    HiOutlineDocumentText,
    HiRefresh,
} from 'react-icons/hi';

interface Flight {
  flight_id: string;
  drone_id: string;
  drone_name: string;
  company_id: number;
  company_name: string;
  start_time: string;
  end_time: string;
  max_altitude?: number;
  serial_number?: string;
}

interface Props {
  token: string | null;
  isActive?: boolean;
}

function formatDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const secs = Math.round((end - start) / 1000);
  if (secs < 0) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function FlytrelayFlights({ token, isActive = true }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fetchFlights = useCallback(async (pageNum: number = 1) => {
    if (!token) {
      setError('no_token');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedFlight(null);
    setPreview(null);
    setPreviewError(null);
    try {
      const res = await axios.get(`/api/flytrelay/flights?page=${pageNum}`);
      setFlights(res.data.flights ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to fetch FlytRelay flights';
      setError(err?.response?.status === 422 ? 'no_token' : msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isActive) {
      setPage(1);
      fetchFlights(1);
    }
  }, [fetchFlights, isActive]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFlights(newPage);
  };

  async function handleSelectFlight(flight: Flight) {
    if (selectedFlight?.flight_id === flight.flight_id) return;

    setSelectedFlight(flight);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      const res = await fetch(
        `/api/flytrelay/flights/gutma?flightId=${encodeURIComponent(flight.flight_id)}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message ?? `Server error ${res.status}`);

      setPreview(body.data);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to load flight telemetry.';
      setPreviewError(msg);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  const bg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';
  const rowSelected = isDark ? 'bg-violet-950/40 border-l-2 border-violet-500' : 'bg-violet-50 border-l-2 border-violet-500';

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in duration-700`}>
      <div className="flex items-center justify-between mb-4">
        <div></div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFlights(page)}
            className={`h-8 gap-1.5 cursor-pointer text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}`}
          >
            <HiRefresh className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {error === 'no_token' && (
          <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 mb-6 ${isDark ? 'bg-violet-950/20 border-violet-800/30' : 'bg-violet-50 border-violet-200'}`}>
            <div className="flex items-center gap-3">
              <HiExclamationCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              <p className={`text-xs font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                No FlytBase integration configured
              </p>
            </div>
          </div>
        )}

        {error && error !== 'no_token' && (
          <div className={`flex items-start gap-3 rounded-xl border p-4 mb-6 ${isDark ? 'bg-red-950/20 border-red-800/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <HiExclamationCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        <div className="flex gap-4 flex-1 min-h-0">
          <div className={`rounded-xl border flex-shrink-0 w-full max-w-sm flex flex-col ${card}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}">
              <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Flights
              </span>
              {!loading && (
                <span className={`text-[11px] font-mono ${textSecondary}`}>
                  {flights.length}
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-800/50 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
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
                    No recent flights
                  </p>
                </div>
              )}

              {!loading && flights.map((flight) => {
                const isSelected = selectedFlight?.flight_id === flight.flight_id;
                return (
                  <button
                    key={flight.flight_id}
                    onClick={() => handleSelectFlight(flight)}
                    className={`cursor-pointer w-full text-left px-4 py-3 transition-colors ${rowHover} ${isSelected ? rowSelected : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${textPrimary}`}>
                          {flight.drone_name}
                        </p>
                        <p className={`text-[10px] font-mono truncate mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                          {flight.flight_id}
                        </p>
                        <div className={`flex items-center gap-1.5 mt-0.5 text-[11px] ${textSecondary}`}>
                          <span className="truncate font-medium">{flight.company_name}</span>
                        </div>
                        <div className={`flex items-center gap-2 mt-1 text-[10px] ${textSecondary}`}>
                          <span className="flex items-center gap-1">
                            <HiClock className="w-3 h-3" />
                            {new Date(flight.start_time).toLocaleString([], {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          <span>{formatDuration(flight.start_time, flight.end_time)}</span>
                          {flight.max_altitude != null && (
                            <span>{Math.round(flight.max_altitude)}m</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <HiChevronRight className={`w-3.5 h-3.5 ${textSecondary}`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {total > 20 && (
              <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={`text-[11px] ${textSecondary}`}>
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      page === 1
                        ? 'opacity-50 cursor-not-allowed'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(Math.ceil(total / 20), page + 1))}
                    disabled={page >= Math.ceil(total / 20)}
                    className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      page >= Math.ceil(total / 20)
                        ? 'opacity-50 cursor-not-allowed'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto">
            {!selectedFlight && !loading && (
              <div className={`rounded-xl border h-64 flex flex-col items-center justify-center gap-3 ${card}`}>
                <HiOutlineDocumentText className={`w-8 h-8 ${textSecondary}`} />
                <p className={`text-xs ${textSecondary}`}>Select a flight to view telemetry</p>
              </div>
            )}

            {selectedFlight && (
              <GutmaPreviewPanel
                flight={{
                  flight_id: selectedFlight.flight_id,
                  flight_name: selectedFlight.drone_name,
                  start_time: new Date(selectedFlight.start_time).getTime(),
                  end_time: new Date(selectedFlight.end_time).getTime(),
                  drone_name: selectedFlight.drone_name,
                }}
                preview={preview}
                loading={previewLoading}
                isDark={isDark}
                previewError={previewError}
                canArchive={false}
                archiving={false}
                archived={false}
                archiveError={null}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
