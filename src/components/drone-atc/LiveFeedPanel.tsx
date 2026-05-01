'use client';

import { FiActivity, FiMapPin } from 'react-icons/fi';
import { TbDrone } from 'react-icons/tb';
import type { TelemetryData } from './useDroneATCSocket';

interface LiveFeedPanelProps {
  drone: TelemetryData | null;
  isDark: boolean;
}

export default function LiveFeedPanel({ drone, isDark }: LiveFeedPanelProps) {
  if (!drone) return null;

  const panelBg = isDark
    ? 'border-slate-600/50 bg-slate-900/90 backdrop-blur-xl'
    : 'border-slate-300 bg-white/92 backdrop-blur-xl shadow-lg';

  const divider = isDark ? 'border-slate-700/60' : 'border-slate-200';
  const labelColor = isDark ? 'text-slate-500' : 'text-slate-400';
  const valueColor = isDark ? 'text-slate-100' : 'text-slate-800';
  const accentColor = isDark ? 'text-violet-400' : 'text-violet-600';
  const mutedSep = isDark ? 'text-slate-700' : 'text-slate-300';

  const online = drone.status === 'online' || !drone.status;
  const statusDot = online ? 'bg-emerald-400' : 'bg-slate-500';

  return (
    <div className={`absolute bottom-4 right-4 w-80 z-[400] rounded-2xl overflow-hidden border ${panelBg}`}>
      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${divider}`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
            isDark ? 'bg-violet-600/15 ring-1 ring-violet-500/20' : 'bg-violet-50 ring-1 ring-violet-200'
          }`}>
            <TbDrone className={`w-3.5 h-3.5 ${accentColor}`} />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Live Telemetry
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className={`text-[11px] font-semibold truncate max-w-[120px] ${accentColor}`}>
            {drone.name ?? drone.drone_id}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3 space-y-3">
        {/* Position row */}
        <div>
          <div className={`flex items-center gap-1 mb-1.5`}>
            <FiMapPin className={`w-3 h-3 ${labelColor}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`}>Position</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={`text-[9px] uppercase tracking-wider block mb-px ${labelColor}`}>Lat / Lon</span>
              <p className={`text-xs font-mono font-bold tabular-nums ${valueColor}`}>
                {drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)}
              </p>
            </div>
            <div>
              <span className={`text-[9px] uppercase tracking-wider block mb-px ${labelColor}`}>Altitude</span>
              <p className={`text-xs font-mono font-bold tabular-nums ${valueColor}`}>
                {Math.round(drone.altitude)}<span className={`text-[10px] ml-0.5 font-medium ${labelColor}`}>m</span>
              </p>
            </div>
          </div>
        </div>

        <div className={`border-t ${divider}`} />

        {/* Systems row */}
        <div>
          <div className={`flex items-center gap-1 mb-1.5`}>
            <FiActivity className={`w-3 h-3 ${labelColor}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`}>Systems</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={`text-[9px] uppercase tracking-wider block mb-px ${labelColor}`}>Sats / Signal</span>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-mono font-bold tabular-nums ${valueColor}`}>
                  {drone.satellites != null ? drone.satellites : '—'}
                </span>
                <span className={`text-[10px] ${mutedSep}`}>/</span>
                <span className={`text-xs font-mono font-bold tabular-nums ${valueColor}`}>
                  {drone.signal_strength != null ? `${drone.signal_strength}%` : '—'}
                </span>
              </div>
            </div>
            <div>
              <span className={`text-[9px] uppercase tracking-wider block mb-px ${labelColor}`}>Battery</span>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-mono font-bold tabular-nums ${
                  drone.battery_percentage > 50
                    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                    : drone.battery_percentage > 20
                      ? isDark ? 'text-amber-400' : 'text-amber-600'
                      : isDark ? 'text-red-400' : 'text-red-600'
                }`}>
                  {drone.battery_percentage}%
                </span>
                {drone.battery_voltage != null && (
                  <>
                    <span className={`text-[10px] ${mutedSep}`}>/</span>
                    <span className={`text-xs font-mono font-bold tabular-nums ${accentColor}`}>
                      {drone.battery_voltage.toFixed(1)}V
                    </span>
                  </>
                )}
                {drone.battery_temp != null && (
                  <>
                    <span className={`text-[10px] ${mutedSep}`}>/</span>
                    <span className={`text-xs font-mono font-bold tabular-nums ${accentColor}`}>
                      {Math.round(drone.battery_temp)}&deg;C
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}