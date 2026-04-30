'use client';

import type { TelemetryData } from './useDroneATCSocket';

interface TelemetryPanelProps {
  drone: TelemetryData | null;
  isDark: boolean;
}

function Stat({ label, value, unit }: { label: string; value: string | number | undefined; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-white">
        {value != null ? `${value}${unit ?? ''}` : '—'}
      </span>
    </div>
  );
}

function headingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export default function TelemetryPanel({ drone, isDark }: TelemetryPanelProps) {
  if (!drone) {
    return (
      <div className={`flex items-center justify-center h-full text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Select a drone to view telemetry
      </div>
    );
  }

  const lastSeen = new Date(drone.timestamp).toLocaleTimeString();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {drone.name ?? drone.drone_id}
          </h3>
          {drone.model && (
            <p className="text-xs text-slate-400">{drone.model}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          drone.status === 'online' || !drone.status
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}>
          {drone.status ?? 'online'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat label="Latitude" value={drone.latitude.toFixed(5)} />
        <Stat label="Longitude" value={drone.longitude.toFixed(5)} />
        <Stat label="Altitude" value={Math.round(drone.altitude)} unit="m" />
        <Stat label="Speed" value={drone.velocity?.toFixed(1)} unit=" m/s" />
        <Stat label="Heading" value={drone.heading != null ? `${Math.round(drone.heading)}° ${headingLabel(drone.heading)}` : undefined} />
        <Stat label="Battery" value={drone.battery_percentage} unit="%" />
        {drone.satellites != null && <Stat label="Satellites" value={drone.satellites} />}
        {drone.signal_strength != null && <Stat label="Signal" value={drone.signal_strength} unit="%" />}
        {drone.battery_voltage != null && <Stat label="Voltage" value={drone.battery_voltage?.toFixed(1)} unit="V" />}
      </div>

      {drone.hms_flags && drone.hms_flags.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Alerts</p>
          <div className="flex flex-wrap gap-1">
            {drone.hms_flags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">Last update: {lastSeen}</p>
    </div>
  );
}
