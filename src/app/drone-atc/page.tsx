'use client';

import type { AircraftState } from '@/app/api/drone-atc/flights/route';
import DroneList from '@/components/drone-atc/DroneList';
import LayerControlPanel, { type LayerVisibility } from '@/components/drone-atc/LayerControlPanel';
import LiveFeedPanel from '@/components/drone-atc/LiveFeedPanel';
import { useDroneATCSocket } from '@/components/drone-atc/useDroneATCSocket';
import WindGridOverlay, { type MapBounds } from '@/components/drone-atc/WindGridOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import '@/lib/i18n/config';
import { ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { GiDeliveryDrone } from 'react-icons/gi';
import { MdFlight, MdRefresh } from 'react-icons/md';

const DroneATCMap = dynamic(() => import('@/components/drone-atc/DroneATCMap'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-2xl bg-slate-800" />,
});

const FLIGHT_REFRESH_MS = 12000;
const OWM_API_KEY = process.env.NEXT_PUBLIC_OWM_API_KEY ?? '';
const ITALY_BOUNDS = { latMin: 36.0, lonMin: 6.5, latMax: 47.5, lonMax: 18.5 } as const;


function StatusBadge({ status, count, isDark }: { status: string; count: number; isDark: boolean }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    connected: isDark ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    connecting: isDark ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    error: isDark ? 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20' : 'bg-red-50 text-red-700 ring-1 ring-red-200',
    idle: isDark ? 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/20' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    no_flytbase_key: isDark ? 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/20' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  };
  const label: Record<string, string> = {
    connected: t('droneAtc.status.live'),
    connecting: t('droneAtc.status.connecting'),
    error: t('droneAtc.status.error'),
    idle: t('droneAtc.status.initialising'),
    no_flytbase_key: t('droneAtc.status.noApiKey'),
  };
  const dotStyle: Record<string, string> = {
    connected: 'bg-emerald-400', connecting: 'bg-amber-400 animate-pulse',
    error: 'bg-red-400', idle: 'bg-slate-500 animate-pulse', no_flytbase_key: 'bg-slate-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full ${styles[status] ?? styles.idle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle[status] ?? dotStyle.idle}`} />
      <span className="hidden sm:inline">{label[status] ?? status}</span>
      {status === 'connected' && count > 0 && <span className="ml-0.5 opacity-60">· {count}</span>}
    </span>
  );
}

export default function DroneATCPage() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { drones: liveDrones, status, errorMessage, reconnect } = useDroneATCSocket();
  const drones = Object.fromEntries(
    Object.entries(liveDrones).filter(([, d]) => d.device_type === 'Drone')
  );

  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const [aircraft, setAircraft] = useState<AircraftState[]>([]);
  const [showFleet, setShowFleet] = useState(false);
  const [layers, setLayers] = useState<LayerVisibility>({
    drones: true, flights: true,
    airspaceA: false, airspaceB: true, airspaceC: true, airspaceD: false,
    wind: false, temp: false, clouds: false, precip: false, pressure: false,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const boundsRef = useRef<MapBounds | null>(null);
  const [windFetchTrigger, setWindFetchTrigger] = useState(0);
  const windTriggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);
  const flightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoSelected = useRef(false);

  const handleUpdateDrones = useCallback(async () => {
    if (syncState === 'loading') return;
    setSyncState('loading');
    try {
      const res = await fetch('/api/drone-atc/users', { method: 'PATCH' });
      setSyncState(res.ok ? 'ok' : 'error');
    } catch {
      setSyncState('error');
    } finally {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => setSyncState('idle'), 3000);
    }
  }, [syncState]);

  const toggleLayer = useCallback((key: keyof LayerVisibility) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    const ids = Object.keys(drones);
    if (ids.length > 0 && !hasAutoSelected.current) {
      setSelectedDroneId(ids[0]);
      hasAutoSelected.current = true;
    }
    if (selectedDroneId && !drones[selectedDroneId] && ids.length > 0) {
      setSelectedDroneId(ids[0]);
    }
  }, [drones, selectedDroneId]);

  const fetchFlights = useCallback(async () => {
    const bounds = boundsRef.current ?? ITALY_BOUNDS;
    const latMin = Math.max(bounds.latMin, ITALY_BOUNDS.latMin);
    const lonMin = Math.max(bounds.lonMin, ITALY_BOUNDS.lonMin);
    const latMax = Math.min(bounds.latMax, ITALY_BOUNDS.latMax);
    const lonMax = Math.min(bounds.lonMax, ITALY_BOUNDS.lonMax);
    try {
      const res = await fetch(`/api/drone-atc/flights?latMin=${latMin}&lonMin=${lonMin}&latMax=${latMax}&lonMax=${lonMax}`);
      if (res.ok) {
        const data = await res.json();
        setAircraft(data.aircraft ?? []);
      }
    } catch {
      console.log('Failed to fetch flights');
    }
  }, []);

  useEffect(() => {
    if (!layers.flights) { setAircraft([]); return; }
    fetchFlights();
    flightTimerRef.current = setInterval(fetchFlights, FLIGHT_REFRESH_MS);
    return () => { if (flightTimerRef.current) clearInterval(flightTimerRef.current); };
  }, [layers.flights, fetchFlights]);

  const getBounds = useCallback((): MapBounds | null => boundsRef.current, []);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    boundsRef.current = bounds;
    if (windTriggerTimerRef.current) clearTimeout(windTriggerTimerRef.current);
    windTriggerTimerRef.current = setTimeout(() => setWindFetchTrigger(t => t + 1), 500);
  }, []);

  useEffect(() => {
    if (layers.wind) setWindFetchTrigger(t => t + 1);
  }, [layers.wind]);

  const droneList = Object.values(drones);
  const selectedDrone = selectedDroneId ? drones[selectedDroneId] ?? null : null;
  const isLoading = status === 'idle' || status === 'connecting';

  const panelClass = isDark
    ? 'bg-slate-900/80 border border-slate-700/50 rounded-2xl backdrop-blur-sm'
    : 'bg-white/90 border border-slate-300 rounded-2xl shadow-sm backdrop-blur-sm';

  const glassPanel = isDark
    ? 'bg-slate-900/95 border border-slate-700/60 shadow-2xl shadow-black/40 backdrop-blur-xl'
    : 'bg-white/97 border border-slate-200/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl';

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>

      <header className={`shrink-0 z-20 transition-colors ${isDark
          ? 'bg-slate-900/90 backdrop-blur-lg border-b border-slate-700/50'
          : 'bg-white/90 backdrop-blur-lg border-b border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        } px-3 sm:px-4 py-3 sm:py-4`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-1 h-7 rounded-full bg-violet-600 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className={`font-semibold text-sm tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('droneAtc.title')}
              </span>
              <span className={`text-[10px] leading-tight hidden sm:block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('droneAtc.subtitle')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleUpdateDrones}
              disabled={syncState === 'loading'}
              className={`flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold px-2 sm:px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60 ${
                syncState === 'ok'
                  ? 'bg-emerald-600/90 text-white'
                  : syncState === 'error'
                  ? 'bg-red-600/90 text-white'
                  : 'bg-violet-700 text-white hover:bg-violet-600/80 ring-1 ring-violet-600/40'
              }`}
            >
              {syncState === 'loading' ? (
                <FiRefreshCw className="w-3 h-3 animate-spin" />
              ) : syncState === 'ok' ? (
                <FiCheck className="w-3 h-3" />
              ) : (
                <FiRefreshCw className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">
                {syncState === 'loading'
                  ? t('droneAtc.sync.updating')
                  : syncState === 'ok'
                  ? t('droneAtc.sync.updated')
                  : syncState === 'error'
                  ? t('droneAtc.sync.failed')
                  : t('droneAtc.sync.updateDrones')}
              </span>
              <span className="sm:hidden">
                {syncState === 'loading'
                  ? t('droneAtc.sync.updatingShort')
                  : syncState === 'ok'
                  ? t('droneAtc.sync.updatedShort')
                  : syncState === 'error'
                  ? t('droneAtc.sync.failedShort')
                  : t('droneAtc.sync.syncDrones')}
              </span>
            </button>

            <StatusBadge status={status} count={droneList.length} isDark={isDark} />

            {status === 'error' && (
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                <MdRefresh className="w-3 h-3" />
                <span className="hidden sm:inline">{t('droneAtc.retry')}</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {status === 'no_flytbase_key' && (
        <div className={`shrink-0 mx-3 sm:mx-4 mt-3 px-3 sm:px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 ring-1 ${isDark ? 'bg-amber-900/15 ring-amber-700/30 text-amber-300' : 'bg-amber-50 ring-amber-200 text-amber-700'
          }`}>
          <FiAlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t('droneAtc.noFlytbaseKey')}</span>
          <Link href="/flytbase" className={`underline font-semibold ${isDark ? 'text-amber-200 hover:text-amber-100' : 'text-amber-800 hover:text-amber-900'}`}>
            {t('droneAtc.configure')}
          </Link>
        </div>
      )}

      <div className="flex flex-1 gap-2 p-2 overflow-hidden">

        <aside className={`hidden md:flex w-64 shrink-0 flex-col overflow-hidden ${panelClass}`}>
          <div className={`px-3 py-2 border-b shrink-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('droneAtc.fleetManagement')}
              </span>
              <div className={`min-w-5 h-5 px-1.5 rounded flex items-center justify-center ${isDark ? 'bg-violet-600/10 ring-1 ring-violet-500/20' : 'bg-violet-50 ring-1 ring-violet-200'
                }`}>
                {isLoading
                  ? <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  : <span className={`text-[10px] font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{droneList.length}</span>
                }
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
            <DroneList
              drones={drones}
              selectedDroneId={selectedDroneId}
              onSelect={setSelectedDroneId}
              isDark={isDark}
              isLoading={isLoading}
            />
          </div>
        </aside>

        <main className={isFullscreen ? 'fixed inset-0 z-9999 overflow-hidden' : `flex-1 relative overflow-hidden ${panelClass}`}>
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <DroneATCMap
              drones={drones}
              aircraft={aircraft}
              selectedDroneId={selectedDroneId}
              layers={layers}
              onDroneClick={setSelectedDroneId}
              isDark={isDark}
              owmApiKey={OWM_API_KEY}
              onBoundsChange={handleBoundsChange}
            />
            {layers.wind && (
              <WindGridOverlay getBounds={getBounds} fetchTrigger={windFetchTrigger} />
            )}
          </div>

          <LayerControlPanel
            layers={layers}
            onToggle={toggleLayer}
            isDark={isDark}
            droneCount={droneList.length}
            aircraftCount={aircraft.length}
            hasOwmKey={!!OWM_API_KEY}
          />

          {layers.flights && (
            <div className={`absolute top-2 z-50 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow flex items-center gap-1 ring-1 ring-amber-400/30 transition-all ${
              showFleet ? 'left-2' : 'left-18 md:left-2'
            }`}>
              <MdFlight className="w-3 h-3" />
              {aircraft.length}
            </div>
          )}

          {!showFleet && (
            <div className="md:hidden absolute top-3 left-3 z-450">
              <button
                type="button"
                onClick={() => setShowFleet(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${glassPanel} ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GiDeliveryDrone className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">{t('droneAtc.fleet')}</span>
                {isLoading
                  ? <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  : droneList.length > 0 && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${isDark ? 'bg-violet-600/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                      {droneList.length}
                    </span>
                  )
                }
              </button>
            </div>
          )}

          {showFleet && (
            <div className={`md:hidden absolute top-3 left-3 z-450 w-56 rounded-2xl overflow-hidden ${glassPanel}`}>
              <div className={`flex items-center justify-between px-3 py-2.5 ${isDark ? 'border-b border-slate-700/60' : 'border-b border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                    <GiDeliveryDrone className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                  </div>
                  <span className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {t('droneAtc.fleet')}
                  </span>
                  <div className={`min-w-4 h-4 px-1 rounded flex items-center justify-center ${isDark ? 'bg-violet-600/10 ring-1 ring-violet-500/20' : 'bg-violet-50 ring-1 ring-violet-200'}`}>
                    {isLoading
                      ? <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
                      : <span className={`text-[9px] font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{droneList.length}</span>
                    }
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFleet(false)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                    isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div
                className="overflow-y-auto p-2"
                style={{ maxHeight: '60vh', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <DroneList
                  drones={drones}
                  selectedDroneId={selectedDroneId}
                  onSelect={(id) => { setSelectedDroneId(id); setShowFleet(false); }}
                  isDark={isDark}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[11px] font-medium px-4 py-2 rounded-xl shadow-xl z-50 flex items-center gap-2 ring-1 ring-red-500/30">
              <FiAlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {errorMessage}
            </div>
          )}

          {selectedDrone && <LiveFeedPanel drone={selectedDrone} isDark={isDark} />}

          <button
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
            className="absolute bottom-9 left-1/2 -translate-x-1/2 z-1010 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(15,15,25,0.70)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </main>
      </div>
    </div>
  );
}
