'use client';

import { useAuthorization } from '@/components/authorization/AuthorizationProvider';
import { GutmaPreviewPanel } from '@/components/control-center/GutmaPreviewPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  HiChevronRight,
  HiClock,
  HiExclamationCircle,
  HiOutlineDocumentText,
  HiRefresh,
  HiLink,
} from 'react-icons/hi';
import { Organization } from './FlightsTabs';
import { NewOperationModal } from '../operation/NewOperationModal';

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
  linked_to_mission?: boolean;
}

interface Props {
  isActive?: boolean;
  selectedOrganization: Organization | null;
  listContainer?: HTMLDivElement | null;
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
type AttachModalTab = 'existing' | 'new';

export function FlytbaseFlights({ isActive = true, selectedOrganization, listContainer = null }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { requireAuthorization } = useAuthorization();

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

  const [attachMissionModalOpen, setAttachMissionModalOpen] = useState(false);
  const [attachModalTab, setAttachModalTab] = useState<AttachModalTab>('existing');
  const [attachableMissions, setAttachableMissions] = useState<any[]>([]);
  const [attachableMissionsLoading, setAttachableMissionsLoading] = useState(false);
  const [attachingMissionId, setAttachingMissionId] = useState<number | null>(null);

  const [newMissionModalOpen, setNewMissionModalOpen] = useState(false);

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
        `/api/flytbase/flights/preview?flightId=${encodeURIComponent(flight.flight_id)}&organizationId=${selectedOrganization?.id}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message ?? `Server error ${res.status}`);
      setPreview(body.data);
      if (body.fromCache) {
        setArchived(true);
      } else {
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

  const handleOpenAttachMissionModal = async () => {
    if (!selectedFlight || !preview) {
      toast.error('Please select a flight first');
      return;
    }
    const droneSerialNumber = preview?.aircraft?.serial_number;
    if (!droneSerialNumber) {
      toast.error('No drone serial number found in flight log');
      return;
    }
    setAttachMissionModalOpen(true);
    setAttachModalTab('existing');
    setAttachableMissionsLoading(true);
    setAttachableMissions([]);
    try {
      const res = await axios.get('/api/operation/missions/attachable', {
        params: { droneSerialNumber },
      });
      if (res.data.code === 1) {
        setAttachableMissions(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch missions');
      }
    } catch {
      toast.error('Failed to fetch missions');
    } finally {
      setAttachableMissionsLoading(false);
    }
  };

  const markFlightAsLinked = useCallback((flightId: string) => {
    setSelectedFlight((prev) => (prev && prev.flight_id === flightId ? { ...prev, linked_to_mission: true } : prev));
    setFlights((prev) => prev.map((f) => (f.flight_id === flightId ? { ...f, linked_to_mission: true } : f)));
  }, []);

  const handleAttachMission = async (missionId: number, missionType?: string, missionCode?: string) => {
    if (!selectedFlight) return;

    // If this is a PDRA mission being attached post-flight, log a compliance warning
    const isPdra = missionType === 'PDRA';

    try {
      await requireAuthorization({
        actionType: 'mission_attach_flight_log',
        entityType: 'mission',
        entityId: String(missionId),
        title: 'Authorize Flight Log Attachment',
        label: `Attach ${selectedFlight.flight_name ?? selectedFlight.flight_id} to ${missionCode ?? `mission #${missionId}`}`,
        details: {
          mission_id: missionId,
          mission_code: missionCode,
          flight_id: selectedFlight.flight_id,
          is_pdra: isPdra,
        },
      });
    } catch {
      return; // user cancelled or wrong PIN
    }

    setAttachingMissionId(missionId);

    try {
      const res = await axios.post(`/api/operation/missions/${missionId}/attach-flight-log`, {
        flight_id: selectedFlight.flight_id,
        organization_id: selectedOrganization?.id,
        ...(isPdra && { post_flight_attach: true }), // backend uses this to write the audit warning
      });
      if (res.data.code === 1) {
        if (isPdra) {
          toast.warning('Flight log attached. Note: This PDRA mission was logged after the flight — a compliance warning has been recorded in the audit log.');
        } else {
          toast.success('Flight log attached to mission — post-flight data has been filled in automatically.');
        }
        markFlightAsLinked(selectedFlight.flight_id);
        setAttachMissionModalOpen(false);
        const droneSerialNumber = preview?.aircraft?.serial_number;
        if (droneSerialNumber) {
          const missionsRes = await axios.get('/api/operation/missions/attachable', {
            params: { droneSerialNumber },
          });
          if (missionsRes.data.code === 1) setAttachableMissions(missionsRes.data.data);
        }
      } else {
        toast.error(res.data.message || 'Failed to attach flight log');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to attach flight log');
    } finally {
      setAttachingMissionId(null);
    }
  };

  const handleOpenNewMission = async () => {
    if (selectedFlight?.linked_to_mission) {
      toast.error('This flight log is already attached to a mission.');
      setAttachMissionModalOpen(false);
      return;
    }

    try {
      await requireAuthorization({
        actionType: 'mission_create_from_flight',
        entityType: 'mission',
        title: 'Authorize New Mission Creation',
        label: `Create a new mission for ${selectedFlight?.flight_name ?? selectedFlight?.flight_id ?? 'this flight'}`,
        details: {
          flight_id: selectedFlight?.flight_id,
        },
      });
    } catch {
      return; // user cancelled or wrong PIN
    }

    setAttachMissionModalOpen(false);
    setNewMissionModalOpen(true);
  };

  const handleNewMissionSuccess = () => {
    setNewMissionModalOpen(false);
  };

  // Fires as soon as the mission is created, so the flight log gets attached
  // immediately instead of relying on the user coming back to manually
  // attach it from the "Attach Existing Mission" list.
  const handleNewMissionCreated = async (op: { pilot_mission_id: number }) => {
    if (!selectedFlight) return;
    try {
      const res = await axios.post(`/api/operation/missions/${op.pilot_mission_id}/attach-flight-log`, {
        flight_id: selectedFlight.flight_id,
        organization_id: selectedOrganization?.id,
      });
      if (res.data.code === 1) {
        markFlightAsLinked(selectedFlight.flight_id);
        const mismatch = res.data.serialNumberMismatch;
        if (mismatch) {
          toast.warning(`Mission created and flight log attached — but the drone's serial number doesn't match the log (log: ${mismatch.logSerialNumber}, mission drone: ${mismatch.missionSerialNumber}).`);
        } else {
          toast.success('Mission created and flight log attached.');
        }
      } else {
        toast.error(res.data.message
          ? `Mission created, but attaching the flight log failed: ${res.data.message}`
          : 'Mission created, but attaching the flight log failed.');
      }
    } catch (err: any) {
      console.error('Failed to auto-attach flight log to new mission:', err);
      const message = err?.response?.data?.message ?? '';
      toast.error(message
        ? `Mission created, but attaching the flight log failed: ${message}`
        : 'Mission created, but attaching the flight log failed.');
    }
  };

  // Prefill the new-mission form with details already known from the flight
  // log, so the user isn't re-typing what's already in the GUTMA data.
  const newMissionPrefill = useMemo(() => {
    if (!selectedFlight || !preview) return null;
    return {
      scheduledStart: preview.start_time ?? null,
      scheduledEnd: preview.end_time ?? null,
      distanceFlown: preview.distance_m ?? null,
    };
  }, [selectedFlight, preview]);

  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50';
  const rowSelected = isDark ? 'bg-violet-950/40 border-l-2 border-violet-500' : 'bg-violet-50 border-l-2 border-violet-500';
  const skeletonClass = isDark ? 'bg-slate-800' : 'bg-slate-200';

  // ── Flights list content (portaled into the shared card when listContainer is provided) ──
  const flightsListInner = (
    <>
      <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
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
            <Skeleton className={`h-3 w-2/3 ${skeletonClass}`} />
            <Skeleton className={`h-2.5 w-1/2 ${skeletonClass}`} />
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
                  {flight.drone_name && (
                    <div className={`flex items-center gap-1.5 mt-0.5 text-[11px] ${textSecondary}`}>
                      <span className="truncate font-medium">{flight.drone_name}</span>
                    </div>
                  )}
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
                    {flight.duration != null && <span>{formatDuration(flight.duration)}</span>}
                    {flight.distance != null && <span>{formatDistance(flight.distance)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {flight.linked_to_mission && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${isDark ? 'border-violet-800/50 text-violet-400' : 'border-violet-200 text-violet-600'}`}>
                      Manual Mission
                    </Badge>
                  )}
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
        <div className={`flex items-center justify-between px-4 py-3 border-t flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className={`text-[11px] ${textSecondary}`}>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${page === 1 ? 'opacity-50 cursor-not-allowed' : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(Math.min(Math.ceil(total / 20), page + 1))}
              disabled={page >= Math.ceil(total / 20)}
              className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${page >= Math.ceil(total / 20) ? 'opacity-50 cursor-not-allowed' : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-700">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                onClick={() => { setFilterMode('window'); setWindow(w.value); }}
                className={`px-2.5 py-1 cursor-pointer rounded text-[11px] font-medium ${filterMode === 'window' && window === w.value
                  ? 'bg-violet-600 text-white'
                  : isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'
                  }`}
              >
                {t(`flytbase.flights.windows.${w.value}`)}
              </button>
            ))}
            <button
              onClick={() => setFilterMode('latest')}
              className={`px-2.5 py-1 cursor-pointer rounded text-[11px] font-medium ${filterMode === 'latest'
                ? 'bg-violet-600 text-white'
                : isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAttachMissionModal}
              disabled={!selectedFlight || !preview || !!selectedFlight?.linked_to_mission}
              title={selectedFlight?.linked_to_mission ? 'This flight log is already attached to a mission' : undefined}
              className={`h-8 gap-1.5 cursor-pointer text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}`}
            >
              <HiLink className="h-3.5 w-3.5" />
              Attach Mission
            </Button>
          </div>
        </div>

        {/* Error banners */}
        <div className="flex-shrink-0">
          {error === 'no_organization' && (
            <div className={`flex items-center gap-3 rounded-xl border p-4 mb-4 ${isDark ? 'bg-amber-950/20 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
              <HiExclamationCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <p className={`text-xs font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>No organization selected.</p>
            </div>
          )}
          {error && error !== 'no_token' && error !== 'no_organization' && (
            <div className={`flex items-start gap-3 rounded-xl border p-4 mb-4 ${isDark ? 'bg-red-950/20 border-red-800/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <HiExclamationCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {!listContainer && (
            <div className={`rounded-xl border flex-shrink-0 w-full max-w-sm flex flex-col ${card}`}>
              {flightsListInner}
            </div>
          )}

          {/* Preview panel */}
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
              />
            )}
          </div>
        </div>
      </div>

      {listContainer && createPortal(
        <div className="h-full flex flex-col">{flightsListInner}</div>,
        listContainer,
      )}

      {/* ── Attach Mission Modal ── */}
      {attachMissionModalOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setAttachMissionModalOpen(false); }}
        >
          <div className={`rounded-xl border shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col ${isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200'}`}>
            {/* Modal header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Attach Flight Log to Mission
              </h2>
              <button
                onClick={() => setAttachMissionModalOpen(false)}
                className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Close
              </button>
            </div>

            {/* Tab bar */}
            <div className={`flex border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setAttachModalTab('existing')}
                className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${attachModalTab === 'existing'
                  ? 'border-violet-600 text-violet-600'
                  : isDark
                    ? 'border-transparent text-slate-400 hover:text-slate-200'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                Attach Existing Mission
              </button>
              <button
                onClick={() => setAttachModalTab('new')}
                className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${attachModalTab === 'new'
                  ? 'border-violet-600 text-violet-600'
                  : isDark
                    ? 'border-transparent text-slate-400 hover:text-slate-200'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                Create New Mission
              </button>
            </div>

            {/* Tab: Attach existing */}
            {attachModalTab === 'existing' && (
              <div className="p-5 overflow-y-auto flex-1">
                {attachableMissionsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className={`h-12 w-full ${skeletonClass}`} />
                    <Skeleton className={`h-12 w-full ${skeletonClass}`} />
                    <Skeleton className={`h-12 w-full ${skeletonClass}`} />
                  </div>
                ) : attachableMissions.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No completed missions found for this drone.
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      You can create a new mission and attach this flight log to it.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setAttachModalTab('new')}
                      className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                    >
                      Create New Mission
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachableMissions.map((mission) => {
                      const isPdra = mission.op_type === 'PDRA' || !!mission.fk_planning_id;
                      const isAttaching = attachingMissionId === mission.pilot_mission_id;
                      const hasLog = !!mission.has_flight_log;
                      return (
                        <div
                          key={mission.pilot_mission_id}
                          className={`rounded-lg border p-4 ${hasLog ? 'opacity-50' : ''} ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {mission.mission_code || mission.mission_name}
                                </p>
                                {isPdra && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-amber-900/40 text-amber-400 border border-amber-800/50' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                    PDRA
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {mission.tool?.tool_name || mission.tool?.tool_code}
                              </p>
                              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {mission.actual_start && new Date(mission.actual_start).toLocaleString()}
                              </p>
                              {hasLog ? (
                                <p className={`text-[10px] mt-1 flex items-center gap-1 ${isDark ? 'text-red-400/80' : 'text-red-600'}`}>
                                  <HiExclamationCircle className="w-3 h-3 shrink-0" />
                                  This mission already has a flight log attached
                                </p>
                              ) : isPdra && (
                                <p className={`text-[10px] mt-1 flex items-center gap-1 ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
                                  <HiExclamationCircle className="w-3 h-3 shrink-0" />
                                  Post-flight attach — compliance warning will be logged
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAttachMission(mission.pilot_mission_id, isPdra ? 'PDRA' : 'OPEN', mission.mission_code || mission.mission_name)}
                              disabled={isAttaching || hasLog}
                              title={hasLog ? 'This mission already has a flight log attached' : undefined}
                              className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white shrink-0"
                            >
                              {isAttaching ? 'Attaching…' : 'Attach'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {attachModalTab === 'new' && (
              <div className="p-5 flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className={`rounded-full p-3 ${isDark ? 'bg-violet-900/30' : 'bg-violet-50'}`}>
                  <HiLink className={`w-6 h-6 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Create a mission for this flight
                  </p>
                  <p className={`text-xs max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    This opens the standard mission creation form. Once created, come back here to attach the flight log.
                    If you select a <span className="font-medium">PDRA</span> operation type, a compliance warning will be recorded in the audit log.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenNewMission}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 px-4"
                >
                  Open Mission Form
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <NewOperationModal
        open={newMissionModalOpen}
        onClose={() => setNewMissionModalOpen(false)}
        onSuccess={handleNewMissionSuccess}
        onSaved={handleNewMissionCreated}
        logSerialNumber={preview?.aircraft?.serial_number ?? null}
        createPrefill={newMissionPrefill}
        isDark={isDark}
      />

    </>
  );
}