'use client';

import { MdGpsFixed } from 'react-icons/md';
import { TbDrone } from 'react-icons/tb';
import type { TelemetryData } from './useDroneATCSocket';

interface LiveFeedPanelProps {
  drone: TelemetryData | null;
  isDark: boolean;
}

export default function LiveFeedPanel({ drone, isDark }: LiveFeedPanelProps) {
  const panelBorder = isDark
    ? 'border-slate-800 bg-slate-900/95 backdrop-blur-md'
    : 'border-slate-200 bg-white/95 backdrop-blur-md shadow-lg';

  const divider = isDark ? 'border-slate-800' : 'border-slate-100';
  const labelColor = isDark ? 'text-slate-500' : 'text-slate-400';
  const valueColor = isDark ? 'text-slate-200' : 'text-slate-800';
  const accentColor = isDark ? 'text-violet-400' : 'text-violet-600';

  return (
    <div className={`absolute bottom-4 right-4 w-80 z-[400] rounded-2xl overflow-hidden border ${panelBorder}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${divider}`}>
        <div className="flex items-center gap-2">
          <TbDrone className={`w-4 h-4 ${accentColor}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Live Feed
          </span>
        </div>
        {drone && (
          <span className={`text-xs font-semibold truncate max-w-[140px] ${accentColor}`}>
            {drone.name ?? drone.drone_id}
          </span>
        )}
      </div>

      {drone ? (
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <span className={`text-[10px] uppercase tracking-wider font-medium block mb-0.5 ${labelColor}`}>
                Lat/Lon
              </span>
              <p className={`text-xs font-mono font-semibold ${valueColor}`}>
                {drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)}
              </p>
            </div>
            <div>
              <span className={`text-[10px] uppercase tracking-wider font-medium block mb-0.5 ${labelColor}`}>
                Alt
              </span>
              <p className={`text-xs font-mono font-semibold ${valueColor}`}>
                {Math.round(drone.altitude)}m
              </p>
            </div>
          </div>

          <div className={`border-t mb-3 ${divider}`} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={`text-[10px] uppercase tracking-wider font-medium block mb-0.5 ${labelColor}`}>
                Sats/Signal
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono font-semibold ${valueColor}`}>
                  {drone.satellites != null ? drone.satellites : '--'}
                </span>
                <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>/</span>
                <span className={`text-xs font-mono font-semibold ${valueColor}`}>
                  {drone.signal_strength != null ? `${drone.signal_strength}%` : '--'}
                </span>
              </div>
            </div>
            <div>
              <span className={`text-[10px] uppercase tracking-wider font-medium block mb-0.5 ${labelColor}`}>
                Battery HMS
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono font-semibold ${valueColor}`}>
                  {drone.battery_percentage}%
                </span>
                {drone.battery_voltage != null && (
                  <>
                    <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>/</span>
                    <span className={`text-xs font-mono font-semibold ${accentColor}`}>
                      {drone.battery_voltage.toFixed(1)}V
                    </span>
                  </>
                )}
                {drone.battery_temp != null && (
                  <>
                    <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>/</span>
                    <span className={`text-xs font-mono font-semibold ${accentColor}`}>
                      {Math.round(drone.battery_temp)}&deg;C
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <MdGpsFixed className={`w-6 h-6 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Select a drone for live feed
          </p>
        </div>
      )}
    </div>
  );
}