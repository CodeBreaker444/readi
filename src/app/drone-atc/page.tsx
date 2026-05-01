'use client';

import type { AircraftState } from '@/app/api/drone-atc/flights/route';
import DroneList from '@/components/drone-atc/DroneList';
import LiveFeedPanel from '@/components/drone-atc/LiveFeedPanel';
import { useDroneATCSocket } from '@/components/drone-atc/useDroneATCSocket';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { MdFlight, MdRefresh } from 'react-icons/md';

const DroneATCMap = dynamic(() => import('@/components/drone-atc/DroneATCMap'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-2xl bg-slate-800" />,
});

const DEFAULT_CENTER = { lat: 20, lon: 0 };
const FLIGHT_REFRESH_MS = 15000;

function StatusBadge({ status, count, isDark }: { status: string; count: number; isDark: boolean }) {
  const styles: Record<string, string> = {
    connected: isDark
      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    connecting: isDark
      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
      : 'bg-amber-50 text-amber-700 border border-amber-200',
    error: isDark
      ? 'bg-red-500/15 text-red-300 border border-red-500/25'
      : 'bg-red-50 text-red-700 border border-red-200',
    idle: isDark
      ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
      : 'bg-slate-100 text-slate-500 border border-slate-200',
    no_flytbase_key: isDark
      ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
      : 'bg-slate-100 text-slate-500 border border-slate-200',
  };
  const label: Record<string, string> = {
    connected: 'Connected',
    connecting: 'Connecting...',
    error: 'Connection error',
    idle: 'Initialising...',
    no_flytbase_key: 'No FlytBase key',
  };
  const dotStyle: Record<string, string> = {
    connected: 'bg-emerald-400',
    connecting: 'bg-amber-400 animate-pulse',
    error: 'bg-red-400',
    idle: 'bg-slate-500 animate-pulse',
    no_flytbase_key: 'bg-slate-500',
  };
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles[status] ?? styles.idle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle[status] ?? dotStyle.idle}`} />
      {label[status] ?? status}
    </span>
  );
}

function LayerToggle({
  label,
  active,
  onChange,
  icon,
  isDark,
}: {
  label: string;
  active: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
        active
          ? 'bg-violet-600 border border-violet-500 text-white shadow-lg shadow-violet-900/20'
          : isDark
            ? 'bg-slate-800/80 border border-slate-700/60 text-slate-400 hover:border-violet-700/50 hover:text-violet-300'
            : 'bg-slate-100 border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function DroneATCPage() {
  const { isDark } = useTheme();
  const { drones, status, errorMessage, reconnect } = useDroneATCSocket();
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const [aircraft, setAircraft] = useState<AircraftState[]>([]);
  const [showDrones, setShowDrones] = useState(true);
  const [showFlights, setShowFlights] = useState(false);
  const [mapCenter] = useState(DEFAULT_CENTER);
  const flightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFlights = async () => {
    const { lat, lon } = mapCenter;
    const delta = 10;
    try {
      const res = await fetch(
        `/api/drone-atc/flights?latMin=${lat - delta}&lonMin=${lon - delta}&latMax=${lat + delta}&lonMax=${lon + delta}`
      );
      if (res.ok) {
        const data = await res.json();
        setAircraft(data.aircraft ?? []);
      }
    } catch { 
      console.log('Failed to fetch drones');
      
     }
  };

  useEffect(() => {
    if (!showFlights) { setAircraft([]); return; }
    fetchFlights();
    flightTimerRef.current = setInterval(fetchFlights, FLIGHT_REFRESH_MS);
    return () => { if (flightTimerRef.current) clearInterval(flightTimerRef.current); };
  }, [showFlights]);

  const droneList = Object.values(drones);
  const selectedDrone = selectedDroneId ? drones[selectedDroneId] ?? null : null;
  const isLoading = status === 'idle' || status === 'connecting';

  const panelClass = isDark
    ? 'bg-slate-900 border border-slate-800 rounded-2xl'
    : 'bg-white border border-slate-200 rounded-2xl shadow-sm';

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div
        className={`shrink-0 z-10 backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-slate-800 border-b border-slate-700 text-white'
            : 'bg-white border-b border-slate-200 text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
        } px-3 sm:px-6 py-4`}
      >
        <div className="mx-auto max-w-[1800px] space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 shrink-0 rounded-full bg-violet-600" />
              <div>
                <h1 className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Drone ATC
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={status} count={droneList.length} isDark={isDark} />
            {/* <LayerToggle
              label="Drones"
              active={showDrones}
              onChange={setShowDrones}
              icon={<GiDeliveryDrone className="w-3.5 h-3.5" />}
              isDark={isDark}
            />
            <LayerToggle
              label="Live Flights"
              active={showFlights}
              onChange={setShowFlights}
              icon={<MdFlight className="w-3.5 h-3.5" />}
              isDark={isDark}
            /> */}
            {status === 'error' && (
              <button
                onClick={reconnect}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-500 transition-colors font-medium border border-red-500/60"
              >
                <MdRefresh className="w-3.5 h-3.5" />
                Reconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {status === 'no_flytbase_key' && (
        <div className={`shrink-0 mx-4 mt-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 border ${
          isDark
            ? 'bg-amber-900/20 border-amber-800/50 text-amber-300'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <FiAlertTriangle className="w-4 h-4 shrink-0" />
          <span>No FlytBase API key configured.</span>
          <Link href="/flytbase" className={`underline font-medium ${isDark ? 'text-amber-200 hover:text-amber-100' : 'text-amber-800 hover:text-amber-900'}`}>
            Set it up in FlytBase settings
          </Link>
        </div>
      )}

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">

        <div className={`w-72 shrink-0 flex flex-col overflow-hidden ${panelClass}`}>
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Fleet Management
                </h2>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  {isLoading ? 'Scanning airspace...' : `${droneList.length} unit${droneList.length !== 1 ? 's' : ''} tracked`}
                </p>
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isDark
                  ? 'bg-violet-600/15 border border-violet-500/20'
                  : 'bg-violet-50 border border-violet-200'
              }`}>
                {isLoading ? (
                  <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                ) : (
                  <span className={`text-xs font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{droneList.length}</span>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
            <DroneList
              drones={drones}
              selectedDroneId={selectedDroneId}
              onSelect={setSelectedDroneId}
              isDark={isDark}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className={`flex-1 relative overflow-hidden ${panelClass}`}>
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <DroneATCMap
              drones={drones}
              aircraft={aircraft}
              selectedDroneId={selectedDroneId}
              showDrones={showDrones}
              showFlights={showFlights}
              onDroneClick={setSelectedDroneId}
              isDark={isDark}
            />
          </div>

          {errorMessage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
              <FiAlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {errorMessage}
            </div>
          )}

          {showFlights && (
            <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg shadow z-50 flex items-center gap-1.5 font-medium border border-amber-400/30">
              <MdFlight className="w-3.5 h-3.5" />
              {aircraft.length} flights
            </div>
          )}

          <LiveFeedPanel drone={selectedDrone} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}