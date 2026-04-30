'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/useTheme';
import { useDroneATCSocket } from '@/components/drone-atc/useDroneATCSocket';
import DroneList from '@/components/drone-atc/DroneList';
import TelemetryPanel from '@/components/drone-atc/TelemetryPanel';
import WeatherPanel from '@/components/drone-atc/WeatherPanel';
import type { AircraftState } from '@/app/api/drone-atc/flights/route';
import Link from 'next/link';

const DroneATCMap = dynamic(() => import('@/components/drone-atc/DroneATCMap'), { ssr: false });

const DEFAULT_CENTER = { lat: 20, lon: 0 };
const FLIGHT_REFRESH_MS = 15000;

function StatusBadge({ status, count }: { status: string; count: number }) {
  const styles: Record<string, string> = {
    connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    connecting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    idle: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    no_flytbase_key: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  };
  const label: Record<string, string> = {
    connected: `${count} drone${count !== 1 ? 's' : ''} live`,
    connecting: 'Connecting…',
    error: 'Connection error',
    idle: 'Initialising…',
    no_flytbase_key: 'No FlytBase key',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status] ?? styles.idle}`}>
      {label[status] ?? status}
    </span>
  );
}

function LayerToggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
        active
          ? 'bg-blue-500 border-blue-500 text-white'
          : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400'
      }`}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: active ? 'white' : 'currentColor', opacity: active ? 1 : 0.5 }} />
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
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!showFlights) { setAircraft([]); return; }
    fetchFlights();
    flightTimerRef.current = setInterval(fetchFlights, FLIGHT_REFRESH_MS);
    return () => { if (flightTimerRef.current) clearInterval(flightTimerRef.current); };
  }, [showFlights]);

  const droneList = Object.values(drones);
  const selectedDrone = selectedDroneId ? drones[selectedDroneId] ?? null : null;

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Drone ATC
          </span>
          <StatusBadge status={status} count={droneList.length} />
        </div>

        <div className="flex items-center gap-2">
          <LayerToggle label="Drones" active={showDrones} onChange={setShowDrones} />
          <LayerToggle label="Live Flights" active={showFlights} onChange={setShowFlights} />
          {status === 'error' && (
            <button
              onClick={reconnect}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* No FlytBase key banner */}
      {status === 'no_flytbase_key' && (
        <div className={`shrink-0 px-5 py-2.5 border-b text-sm flex items-center gap-2 ${isDark ? 'bg-amber-900/20 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <span>⚠️ No FlytBase API key configured.</span>
          <Link href="/flytbase" className="underline font-medium">Set it up in FlytBase settings →</Link>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className={`w-64 shrink-0 flex flex-col border-r overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex-1 overflow-y-auto p-3">
            <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Drones ({droneList.length})
            </p>
            <DroneList
              drones={drones}
              selectedDroneId={selectedDroneId}
              onSelect={setSelectedDroneId}
              isDark={isDark}
            />
          </div>

          <div className="p-3 border-t shrink-0 border-slate-200 dark:border-slate-700">
            <WeatherPanel lat={mapCenter.lat} lon={mapCenter.lon} isDark={isDark} />
          </div>
        </div>

        {/* Map + telemetry */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <DroneATCMap
              drones={drones}
              aircraft={aircraft}
              selectedDroneId={selectedDroneId}
              showDrones={showDrones}
              showFlights={showFlights}
              onDroneClick={setSelectedDroneId}
              isDark={isDark}
            />

            {errorMessage && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-50">
                {errorMessage}
              </div>
            )}

            {showFlights && (
              <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs px-2 py-1 rounded shadow z-50">
                ✈ {aircraft.length} flights
              </div>
            )}
          </div>

          {/* Telemetry panel */}
          <div className={`h-44 shrink-0 border-t overflow-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <TelemetryPanel drone={selectedDrone} isDark={isDark} />
          </div>
        </div>
      </div>
    </div>
  );
}
