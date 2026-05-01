'use client';

import { FiArrowUp, FiCrosshair, FiThermometer, FiWifi, FiZap } from 'react-icons/fi';
import { TbDrone, TbSatellite } from 'react-icons/tb';
import type { TelemetryData } from './useDroneATCSocket';

interface LiveFeedPanelProps {
  drone: TelemetryData | null;
  isDark: boolean;
}

export default function LiveFeedPanel({ drone, isDark }: LiveFeedPanelProps) {
  if (!drone) return null;

  const bg     = isDark ? 'bg-slate-900/92 border-slate-700/50 backdrop-blur-xl' : 'bg-white/95 border-slate-200 shadow-lg backdrop-blur-xl';
  const div    = isDark ? 'border-slate-700/50' : 'border-slate-100';
  const lbl    = isDark ? 'text-slate-500' : 'text-slate-400';
  const val    = isDark ? 'text-slate-100' : 'text-slate-800';
  const accent = isDark ? 'text-violet-400' : 'text-violet-600';

  const online = drone.status === 'online' || !drone.status;

  const battColor = drone.battery_percentage > 50
    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
    : drone.battery_percentage > 20
      ? isDark ? 'text-amber-400' : 'text-amber-600'
      : isDark ? 'text-red-400' : 'text-red-600';

  return (
    <div className={`absolute bottom-3 right-3 w-68 z-400 rounded-2xl overflow-hidden border ${bg}`}>

      <div className={`flex items-center justify-between px-3 py-2 border-b ${div}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
            <TbDrone className={`w-3 h-3 ${accent}`} />
          </div>
          <span className={`text-xs font-bold truncate ${val}`}>
            {drone.name ?? drone.drone_id}
          </span>
          {drone.model && (
            <span className={`text-[10px] truncate ${lbl}`}>· {drone.model}</span>
          )}
        </div>
        <span className={`w-2 h-2 rounded-full shrink-0 ml-2 ${
          online ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-slate-500'
        }`} />
      </div>

      <div className="px-3 py-2 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <FiCrosshair className={`w-3 h-3 shrink-0 ${lbl}`} />
            <span className={`text-[11px] font-mono font-bold tabular-nums truncate ${val}`}>
              {drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <FiArrowUp className={`w-3 h-3 ${lbl}`} />
            <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
              {Math.round(drone.altitude)}<span className={`text-[9px] ml-px ${lbl}`}>m</span>
            </span>
          </div>
        </div>

        <div className={`border-t ${div}`} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">

          <div className="flex items-center gap-1.5">
            <TbSatellite className={`w-3.5 h-3.5 shrink-0 ${lbl}`} />
            <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
              {drone.satellites != null ? drone.satellites : '—'}
            </span>
            <span className={`text-[9px] ${lbl}`}>sat</span>
          </div>

          <div className="flex items-center gap-1.5">
            <FiWifi className={`w-3 h-3 shrink-0 ${lbl}`} />
            <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
              {drone.signal_strength != null ? `${Math.round(drone.signal_strength)}%` : '—'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <FiZap className={`w-3 h-3 shrink-0 ${battColor}`} />
            <span className={`text-[11px] font-mono font-bold tabular-nums ${battColor}`}>
              {Math.round(drone.battery_percentage)}%
            </span>
            {drone.battery_voltage != null && (
              <span className={`text-[9px] font-mono tabular-nums ${lbl}`}>
                {drone.battery_voltage.toFixed(1)}V
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <FiThermometer className={`w-3 h-3 shrink-0 ${lbl}`} />
            <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
              {drone.battery_temp != null ? `${Math.round(drone.battery_temp)}°C` : '—'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
