'use client';

import { FiAlertTriangle } from 'react-icons/fi';
import type { TelemetryData } from './useDroneATCSocket';

interface TelemetryPanelProps {
  drone: TelemetryData | null;
  isDark: boolean;
}

function Stat({ label, value, unit, isDark }: { label: string; value: string | number | undefined; unit?: string; isDark: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}>
        {value != null ? `${value}${unit ?? ''}` : '--'}
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
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{drone.model}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
          drone.status === 'online' || !drone.status
            ? isDark
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            : isDark
              ? 'bg-slate-700/50 text-slate-400 border-slate-600/30'
              : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {drone.status ?? 'online'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat label="Latitude" value={drone.latitude.toFixed(5)} isDark={isDark} />
        <Stat label="Longitude" value={drone.longitude.toFixed(5)} isDark={isDark} />
        <Stat label="Altitude" value={Math.round(drone.altitude)} unit="m" isDark={isDark} />
        <Stat label="Speed" value={drone.velocity?.toFixed(1)} unit=" m/s" isDark={isDark} />
        <Stat label="Heading" value={drone.heading != null ? `${Math.round(drone.heading)}° ${headingLabel(drone.heading)}` : undefined} isDark={isDark} />
        <Stat label="Battery" value={drone.battery_percentage} unit="%" isDark={isDark} />
        {drone.satellites != null && <Stat label="Satellites" value={drone.satellites} isDark={isDark} />}
        {drone.signal_strength != null && <Stat label="Signal" value={drone.signal_strength} unit="%" isDark={isDark} />}
        {drone.battery_voltage != null && <Stat label="Voltage" value={drone.battery_voltage?.toFixed(1)} unit="V" isDark={isDark} />}
      </div>

      {drone.hms_flags && drone.hms_flags.length > 0 && (
        <div className="mb-3">
          <p className={`text-xs uppercase tracking-wider font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Alerts
          </p>
          <div className="flex flex-wrap gap-1">
            {drone.hms_flags.map((flag, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
              }`}>
                <FiAlertTriangle className="w-3 h-3" />
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Last update: {lastSeen}</p>
    </div>
  );
}