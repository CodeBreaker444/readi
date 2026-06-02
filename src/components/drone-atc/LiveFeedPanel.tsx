'use client';

import { Video } from 'lucide-react';
import { FiArrowUp, FiCrosshair, FiDroplet, FiRefreshCw, FiThermometer, FiWifi, FiWind, FiZap } from 'react-icons/fi';
import { MdDock } from 'react-icons/md';
import { TbDrone, TbSatellite } from 'react-icons/tb';
import type { TelemetryData } from './useDroneATCSocket';

interface LiveFeedPanelProps {
  drone: TelemetryData | null;
  isDark: boolean;
  wrapperClassName?: string;
  onCameraClick?: () => void;
  cameraActive?: boolean;
  cameraLoading?: boolean;
  isDock?: boolean;
}

export default function LiveFeedPanel({
  drone, isDark, wrapperClassName,
  onCameraClick, cameraActive, cameraLoading, isDock,
}: LiveFeedPanelProps) {
  if (!drone) return null;

  const posClass = wrapperClassName !== undefined
    ? wrapperClassName
    : 'absolute bottom-3 right-3 w-68 z-[400]';

  const bg     = isDark ? 'bg-slate-900/92 border-slate-700/50 backdrop-blur-xl' : 'bg-white/95 border-slate-200 shadow-lg backdrop-blur-xl';
  const div    = isDark ? 'border-slate-700/50' : 'border-slate-100';
  const lbl    = isDark ? 'text-slate-500' : 'text-slate-400';
  const val    = isDark ? 'text-slate-100' : 'text-slate-800';
  const accent = isDock
    ? (isDark ? 'text-cyan-400' : 'text-cyan-600')
    : (isDark ? 'text-violet-400' : 'text-violet-600');

  const online = drone.status === 'online' || !drone.status;

  const battColor = (drone.battery_percentage ?? 0) > 50
    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
    : (drone.battery_percentage ?? 0) > 20
      ? isDark ? 'text-amber-400' : 'text-amber-600'
      : isDark ? 'text-red-400' : 'text-red-600';

  const chargingColor = drone.dock_charging_status === 'Charging'
    ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
    : lbl;

  const streamBtnColor = isDock
    ? cameraActive
      ? 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-400/50 shadow-red-500/30 shadow-md'
      : 'bg-cyan-600 hover:bg-cyan-500 text-white ring-2 ring-cyan-400/40 shadow-cyan-500/20 shadow-md'
    : cameraActive
      ? 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-400/50 shadow-red-500/30 shadow-md'
      : 'bg-violet-600 hover:bg-violet-500 text-white ring-2 ring-violet-400/40 shadow-violet-500/20 shadow-md';

  return (
    <div className={`${posClass} rounded-2xl overflow-hidden border ${bg}`}>

      <div className={`flex items-center justify-between px-3 py-2 border-b ${div}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
            isDock
              ? isDark ? 'bg-cyan-500/15' : 'bg-cyan-50'
              : isDark ? 'bg-violet-500/15' : 'bg-violet-50'
          }`}>
            {isDock
              ? <MdDock className={`w-3 h-3 ${accent}`} />
              : <TbDrone className={`w-3 h-3 ${accent}`} />}
          </div>
          <span className={`text-xs font-bold truncate ${val}`}>
            {drone.name ?? drone.drone_id}
          </span>
          {drone.model && (
            <span className={`text-[10px] truncate ${lbl}`}>· {drone.model}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {onCameraClick && (
            <button
              type="button"
              onClick={onCameraClick}
              title={cameraActive ? 'Stop stream' : 'Live stream'}
              className={`flex cursor-pointer items-center justify-center w-9 h-9 rounded-xl transition-all shadow-sm ${streamBtnColor}`}
            >
              {cameraLoading
                ? <FiRefreshCw className="w-5 h-5 animate-spin" />
                : <Video className="w-5 h-5" />
              }
            </button>
          )}
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            online ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-slate-500'
          }`} />
        </div>
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

        {isDock ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <FiThermometer className={`w-3 h-3 shrink-0 ${lbl}`} />
              <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
                {drone.dock_temperature != null ? `${drone.dock_temperature.toFixed(1)}°C` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FiDroplet className={`w-3 h-3 shrink-0 ${lbl}`} />
              <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
                {drone.dock_humidity != null ? `${drone.dock_humidity}%` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FiZap className={`w-3 h-3 shrink-0 ${chargingColor}`} />
              <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
                {drone.dock_charging_status ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FiWind className={`w-3 h-3 shrink-0 ${lbl}`} />
              <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
                {drone.dock_wind_speed != null ? `${drone.dock_wind_speed} m/s` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <FiWifi className={`w-3 h-3 shrink-0 ${lbl}`} />
              <span className={`text-[10px] ${lbl}`}>Power:</span>
              <span className={`text-[11px] font-mono font-bold tabular-nums ${val}`}>
                {drone.dock_power_mode ?? '—'}
              </span>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
