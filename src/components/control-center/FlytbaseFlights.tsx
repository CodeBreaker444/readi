'use client';

import { GutmaPreviewPanel } from '@/components/control-center/GutmaPreviewPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import Link from 'next/link';
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

interface Organization {
  id: number;
  name: string;
  org_id: string;
}

interface Props {
  isActive?: boolean;
}

const WINDOWS = [
  { value: 60 },
  { value: 360 },
  { value: 720 },
  { value: 1440 },
];

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

type FilterMode = 'window' | 'latest';

export function FlytbaseFlights({ isActive = true }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [window, setWindow] = useState(1440);
  const [filterMode, setFilterMode] = useState<FilterMode>('window');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [canArchive, setCanArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<{ message: string; missing_sns: string[] } | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    setOrgLoading(true);
    try {
      const res = await axios.get('/api/flytbase/my-organizations');
      setOrganizations(res.data.organizations || []);
      if (res.data.organizations && res.data.organizations.length > 0) {
        setSelectedOrganization(res.data.organizations[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setOrgLoading(false);
    }
  }, []);

  const fetchFlights = useCallback(async (win: number, mode: FilterMode, pageNum: number = 1) => {
    if (!selectedOrganization) {
      setError('no_organization');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedFlight(null);
    setPreview(null);
    setCanArchive(false);
    setArchived(false);
    setArchiveError(null);
    try {
      const url = mode === 'latest'
        ? `/api/flytbase/flights?mode=latest&page=${pageNum}&organizationId=${selectedOrganization.id}`
        : `/api/flytbase/flights?window=${win}&page=${pageNum}&organizationId=${selectedOrganization.id}`;
      const res = await axios.get(url);
      setFlights(res.data.flights ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: any) {
     const msg = err?.response?.data?.message ?? t('flytbase.flights.noRecentFlights');
      setError(err?.response?.status === 422 ? 'no_token' : msg);
    } finally {
      setLoading(false);
    }
  }, [selectedOrganization, t]);

  useEffect(() => {
    if (isActive) {
      fetchOrganizations();
    }
  }, [fetchOrganizations, isActive]);

  useEffect(() => {
    if (isActive && selectedOrganization) {
      setPage(1);
      fetchFlights(window, filterMode, 1);
    }
  }, [fetchFlights, window, filterMode, isActive, selectedOrganization]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFlights(window, filterMode, newPage);
  };

  async function handleSelectFlight(flight: Flight) {
    if (selectedFlight?.flight_id === flight.flight_id) return;

    setSelectedFlight(flight);
    setPreview(null);
    setCanArchive(false);
    setArchived(false);
    setPreviewError(null);
    setArchiveError(null);
    setPreviewLoading(true);

    try {
      const res = await fetch(
        `/api/flytbase/flights/preview?flightId=${encodeURIComponent(flight.flight_id)}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message ?? `Server error ${res.status}`);

      setPreview(body.data);

      if (body.fromCache) {
        setArchived(true);
      } else {
        // preview loaded fresh from FlytBase — ready to archive
        setCanArchive(true);
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to load flight log.';
      setPreviewError(msg);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  // async function handleArchive() {
  //   if (!selectedFlight || !preview) return;
  //   setArchiving(true);
  //   setArchiveError(null);
  //   try {
  //     const res = await fetch('/api/flytbase/flights/archive', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ flightId: selectedFlight.flight_id, preview }),
  //     });
  //     const body = await res.json().catch(() => ({}));

  //     if (!res.ok) {
  //       if (body?.code === 'SN_MISMATCH') {
  //         setArchiveError({ message: body.message, missing_sns: body.missing_sns ?? [] });
  //         return;
  //       }
  //       throw new Error(body?.message ?? `Archive failed (${res.status})`);
  //     }

  //     setArchived(true);
  //     setCanArchive(false);

  //     const updated = body.updated_components ?? [];
  //     const durationSecs = body.duration_seconds ?? 0;
  //     const missionSynced = body.mission_synced ?? false;

  //     let detail = updated.length > 0
  //       ? t('flytbase.archive.archivedDetail', { count: updated.length })
  //       : '';
  //     if (durationSecs > 0) detail += ` · ${formatDuration(durationSecs)}`;
  //     if (missionSynced) detail += ` · ${t('flytbase.archive.missionSynced')}`;

  //     toast.success(t('flytbase.archive.archivedSuccess'), { description: detail || undefined });
  //   } catch (err: any) {
  //     toast.error(err?.message ?? t('flytbase.archive.archiveFailed'));
  //   } finally {
  //     setArchiving(false);
  //   }
  // }

  const bg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';
  const rowSelected = isDark ? 'bg-violet-950/40 border-l-2 border-violet-500' : 'bg-violet-50 border-l-2 border-violet-500';
  const skeletonClass = isDark ? 'bg-slate-800' : 'bg-slate-200';

  return (
    <div className={`h-full flex flex-col overflow-hidden animate-in fade-in duration-700`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => { setFilterMode('window'); setWindow(w.value); }}
              className={`px-2.5 py-1 cursor-pointer rounded text-[11px] font-medium ${
                filterMode === 'window' && window === w.value
                  ? 'bg-violet-600 text-white'
                  : isDark
                  ? 'text-slate-400 bg-slate-800'
                  : 'text-slate-500 bg-slate-100'
              }`}
            >
              {t(`flytbase.flights.windows.${w.value}`)}
            </button>
          ))}
          <button
            onClick={() => setFilterMode('latest')}
            className={`px-2.5 py-1 cursor-pointer rounded text-[11px] font-medium ${
              filterMode === 'latest'
                ? 'bg-violet-600 text-white'
                : isDark
                ? 'text-slate-400 bg-slate-800'
                : 'text-slate-500 bg-slate-100'
            }`}
          >
            {t('flytbase.flights.latest20')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFlights(window, filterMode)}
            className={`h-8 gap-1.5 cursor-pointer text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}`}
          >
            <HiRefresh className="h-3.5 w-3.5" />
            {t('flytbase.flights.refresh')}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {error === 'no_token' && (
          <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 mb-6 ${isDark ? 'bg-violet-950/20 border-violet-800/30' : 'bg-violet-50 border-violet-200'}`}>
            <div className="flex items-center gap-3">
              <HiExclamationCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              <p className={`text-xs font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                {t('flytbase.flights.noToken')}
              </p>
            </div>
            <Link href="/flytbase">
              <Button size="sm" className="h-7 text-xs shrink-0 bg-violet-600 hover:bg-violet-500 text-white">
                {t('flytbase.flights.setUp')}
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

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Organization Selector Sidebar */}
          <div className={`rounded-xl border flex-shrink-0 w-48 flex flex-col ${card}`}>
            <div className="px-4 py-3 border-b">
              <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Organizations
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {orgLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className={`h-8 w-full ${skeletonClass}`} />
                  <Skeleton className={`h-8 w-full ${skeletonClass}`} />
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-4 text-center">
                  <p className={`text-xs ${textSecondary}`}>No organizations</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrganization(org)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedOrganization?.id === org.id
                          ? 'bg-violet-600 text-white'
                          : isDark
                          ? 'hover:bg-slate-800 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`rounded-xl border flex-shrink-0 w-full max-w-sm flex flex-col ${card}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}">
              <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('flytbase.flights.flightsLabel')}
              </span>
              {!loading && (
                <span className={`text-[11px] font-mono ${textSecondary}`}>
                  {flights.length} {t('flytbase.flights.shown')}{total > flights.length ? ` ${t('flytbase.flights.of')} ${total}` : ''}
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
                    {filterMode === 'latest'
                      ? t('flytbase.flights.noRecentFlights')
                      : t('flytbase.flights.noFlightsInWindow', { window })}
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
                          {flight.flight_name ?? flight.flight_id}
                        </p>
                        <p className={`text-[10px] font-mono truncate mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                          {flight.flight_id}
                        </p>
                        <div className={`flex items-center gap-1.5 mt-0.5 text-[11px] ${textSecondary}`}>
                          {flight.drone_name && (
                            <span className="truncate font-medium">{flight.drone_name}</span>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 text-[10px] ${textSecondary}`}>
                          {flight.start_time && (
                            <span className="flex items-center gap-1">
                              <HiClock className="w-3 h-3" />
                              {new Date(flight.start_time).toLocaleString([], {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
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
                <p className={`text-xs ${textSecondary}`}>{t('flytbase.flights.selectFlight')}</p>
              </div>
            )}

            {selectedFlight && (
              <GutmaPreviewPanel
                flight={selectedFlight}
                preview={preview}
                loading={previewLoading}
                isDark={isDark}
                previewError={previewError}
                canArchive={canArchive && !archived}
                archiving={archiving}
                archived={archived}
                archiveError={archiveError}
                // onArchive={handleArchive}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
