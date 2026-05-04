'use client';

import type { AircraftState } from '@/app/api/drone-atc/flights/route';
import DroneList from '@/components/drone-atc/DroneList';
import LayerControlPanel, { type LayerVisibility } from '@/components/drone-atc/LayerControlPanel';
import WindParticleOverlay from '@/components/drone-atc/WindParticleOverlay';
import LiveFeedPanel from '@/components/drone-atc/LiveFeedPanel';
import { useDroneATCSocket } from '@/components/drone-atc/useDroneATCSocket';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { MdFlight, MdRefresh } from 'react-icons/md';

const DroneATCMap = dynamic(() => import('@/components/drone-atc/DroneATCMap'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-2xl bg-slate-800" />,
});

const FLIGHT_REFRESH_MS = 12000;
const OWM_API_KEY = process.env.NEXT_PUBLIC_OWM_API_KEY ?? '';


function StatusBadge({ status, count, isDark }: { status: string; count: number; isDark: boolean }) {
  const styles: Record<string, string> = {
    connected: isDark ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    connecting: isDark ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    error: isDark ? 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20' : 'bg-red-50 text-red-700 ring-1 ring-red-200',
    idle: isDark ? 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/20' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    no_flytbase_key: isDark ? 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/20' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  };
  const label: Record<string, string> = {
    connected: 'Live', connecting: 'Connecting…', error: 'Error', idle: 'Initialising…', no_flytbase_key: 'No API Key',
  };
  const dotStyle: Record<string, string> = {
    connected: 'bg-emerald-400', connecting: 'bg-amber-400 animate-pulse',
    error: 'bg-red-400', idle: 'bg-slate-500 animate-pulse', no_flytbase_key: 'bg-slate-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full ${styles[status] ?? styles.idle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle[status] ?? dotStyle.idle}`} />
      {label[status] ?? status}
      {status === 'connected' && count > 0 && <span className="ml-0.5 opacity-60">· {count}</span>}
    </span>
  );
}

export default function DroneATCPage() {
  const { isDark } = useTheme();
  const { drones: liveDrones, status, errorMessage, reconnect } = useDroneATCSocket();
  const drones = Object.fromEntries(
    Object.entries(liveDrones).filter(([, d]) => d.device_type === 'Drone')
  );

  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const [aircraft, setAircraft] = useState<AircraftState[]>([]);
  const [layers, setLayers] = useState<LayerVisibility>({
    drones: true, flights: true,
    airspaceA: false, airspaceB: true, airspaceC: true, airspaceD: false,
    wind: false, temp: false, clouds: false, precip: false, pressure: false,
  });

  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [windData, setWindData] = useState<{ dir: number; speed: number }>({ dir: 270, speed: 5 });

  const boundsRef = useRef<{ latMin: number; lonMin: number; latMax: number; lonMax: number } | null>(null);
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

  // Auto-select first drone
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
    const bounds = boundsRef.current;
    const { latMin, lonMin, latMax, lonMax } = bounds ?? { latMin: 10, lonMin: -10, latMax: 30, lonMax: 10 };
    try {
      const res = await fetch(`/api/drone-atc/flights?latMin=${latMin}&lonMin=${lonMin}&latMax=${latMax}&lonMax=${lonMax}`);
      if (res.ok) {
        const data = await res.json();
        console.log('data:',data);
        
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

  const handleBoundsChange = useCallback((bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => {
    boundsRef.current = bounds;
  }, []);

  useEffect(() => {
    if (!layers.wind) return;
    let cancelled = false;
    const bounds = boundsRef.current;
    const lat = bounds ? ((bounds.latMin + bounds.latMax) / 2).toFixed(4) : '20';
    const lon = bounds ? ((bounds.lonMin + bounds.lonMax) / 2).toFixed(4) : '0';
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled || !json?.current) return;
        const { wind_direction_10m: dir, wind_speed_10m: speed } = json.current;
        if (dir !== undefined) setWindData({ dir, speed: speed ?? 5 });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [layers.wind]);

  const droneList = Object.values(drones);
  const selectedDrone = selectedDroneId ? drones[selectedDroneId] ?? null : null;
  const isLoading = status === 'idle' || status === 'connecting';

  const panelClass = isDark
    ? 'bg-slate-900/80 border border-slate-700/50 rounded-2xl backdrop-blur-sm'
    : 'bg-white/90 border border-slate-300 rounded-2xl shadow-sm backdrop-blur-sm';

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>

      <header className={`shrink-0 z-20 transition-colors ${isDark
          ? 'bg-slate-900/90 backdrop-blur-lg border-b border-slate-700/50'
          : 'bg-white/90 backdrop-blur-lg border-b border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        } px-4 py-4`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-violet-600 shrink-0" />

            <div className="flex flex-col">
              <span className={`font-semibold text-sm tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Drone ATC
              </span>
              <span className={`text-[10px] leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Air Traffic Control
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdateDrones}
              disabled={syncState === 'loading'}
              className={`flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60 ${
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
              {syncState === 'loading' ? 'Updating…' : syncState === 'ok' ? 'Updated' : syncState === 'error' ? 'Failed' : 'Update Drones To FlytRelay'}
            </button>

            <StatusBadge status={status} count={droneList.length} isDark={isDark} />
            {status === 'error' && (
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                <MdRefresh className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      </header>

      {status === 'no_flytbase_key' && (
        <div className={`shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 ring-1 ${isDark ? 'bg-amber-900/15 ring-amber-700/30 text-amber-300' : 'bg-amber-50 ring-amber-200 text-amber-700'
          }`}>
          <FiAlertTriangle className="w-4 h-4 shrink-0" />
          <span>No FlytBase API key configured.</span>
          <Link href="/flytbase" className={`underline font-semibold ${isDark ? 'text-amber-200 hover:text-amber-100' : 'text-amber-800 hover:text-amber-900'}`}>
            Configure now →
          </Link>
        </div>
      )}

      <div className="flex flex-1 gap-2 p-2 overflow-hidden">

        <aside className={`w-64 shrink-0 flex flex-col overflow-hidden ${panelClass}`}>
          <div className={`px-3 py-2 border-b shrink-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Fleet Management
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

        <main className={`flex-1 relative overflow-hidden ${panelClass}`}>
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
          </div>

          {layers.wind && <WindParticleOverlay windDir={windData.dir} windSpeed={windData.speed} />}

          <LayerControlPanel
            layers={layers}
            onToggle={toggleLayer}
            isDark={isDark}
            droneCount={droneList.length}
            aircraftCount={aircraft.length}
            hasOwmKey={!!OWM_API_KEY}
          />

          {layers.flights && (
            <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow z-50 flex items-center gap-1 ring-1 ring-amber-400/30">
              <MdFlight className="w-3 h-3" />
              {aircraft.length}
            </div>
          )}

          {errorMessage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[11px] font-medium px-4 py-2 rounded-xl shadow-xl z-50 flex items-center gap-2 ring-1 ring-red-500/30">
              <FiAlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {errorMessage}
            </div>
          )}

          {selectedDrone && <LiveFeedPanel drone={selectedDrone} isDark={isDark} />}
        </main>
      </div>
    </div>
  );
}