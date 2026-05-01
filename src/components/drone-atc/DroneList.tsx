'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { FiArrowUp, FiWifi, FiZap } from 'react-icons/fi';
import { GiDeliveryDrone } from 'react-icons/gi';
import type { DroneMap, TelemetryData } from './useDroneATCSocket';

interface DroneListProps {
  drones: DroneMap;
  selectedDroneId: string | null;
  onSelect: (id: string) => void;
  isDark: boolean;
  isLoading?: boolean;
}

function BatteryBar({ pct, isDark }: { pct: number; isDark: boolean }) {
  const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  const displayPct = Math.round(pct);
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className={`flex-1 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/60' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] shrink-0 font-mono text-right ${isDark ? 'text-slate-500' : 'text-slate-400'} ${displayPct === 100 ? 'w-7' : 'w-5'}`}>
        {displayPct}%
      </span>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const online  = status === 'online' || !status;
  const standby = status === 'standby';
  if (online)  return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_5px_rgba(52,211,153,0.8)]" />;
  if (standby) return <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />;
}

function DroneCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`p-3 rounded-xl border-l-[3px] border-l-slate-400/30 ${
      isDark ? 'bg-slate-800/30 border border-l-0 border-slate-700/40' : 'bg-white border border-l-0 border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className={`w-8 h-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <div>
            <Skeleton className={`h-3.5 w-20 mb-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <Skeleton className={`h-2.5 w-12 ${isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`} />
          </div>
        </div>
        <Skeleton className={`h-4 w-14 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Skeleton className={`h-8 rounded ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
        <Skeleton className={`h-8 rounded ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
        <Skeleton className={`h-8 rounded ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
      </div>
    </div>
  );
}

export default function DroneList({ drones, selectedDroneId, onSelect, isDark, isLoading }: DroneListProps) {
  const droneList = Object.values(drones);

  if (isLoading && droneList.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3].map(i => <DroneCardSkeleton key={i} isDark={isDark} />)}
      </div>
    );
  }

  if (droneList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="relative">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isDark ? 'bg-violet-950/50 border border-violet-800/30' : 'bg-violet-50 border border-violet-200'
          }`}>
            <GiDeliveryDrone className={`w-6 h-6 ${isDark ? 'text-violet-500' : 'text-violet-400'}`} />
          </div>
          <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-ping" />
        </div>
        <div className="text-center">
          <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>No Active Drones</p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Scanning airspace</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500/70 animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {droneList.map((drone: TelemetryData) => {
        const isSelected = drone.drone_id === selectedDroneId;
        const online = drone.status === 'online' || !drone.status;
        const borderLeftColor = isSelected
          ? 'border-l-violet-500'
          : online ? 'border-l-emerald-500' : 'border-l-slate-400/40';

        return (
          <button
            key={drone.drone_id}
            onClick={() => onSelect(drone.drone_id)}
            className={`w-full text-left p-3 rounded-xl border-l-[3px] transition-all duration-150 ${borderLeftColor} ${
              isSelected
                ? isDark
                  ? 'bg-violet-900/15 border border-l-0 border-violet-500/30 shadow-sm shadow-violet-900/20'
                  : 'bg-violet-50/80 border border-l-0 border-violet-200 shadow-sm'
                : isDark
                  ? 'bg-slate-800/30 border border-l-0 border-slate-700/40 hover:bg-slate-800/50 hover:border-slate-600/50'
                  : 'bg-white border border-l-0 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected
                    ? isDark ? 'bg-violet-500/15 ring-1 ring-violet-500/30' : 'bg-violet-100 ring-1 ring-violet-200'
                    : isDark ? 'bg-slate-700/50' : 'bg-slate-100'
                }`}>
                  <GiDeliveryDrone className={`w-4 h-4 ${
                    isSelected ? 'text-violet-400' : isDark ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                </div>
                <div className="min-w-0">
                  <span className={`text-sm font-semibold truncate block ${
                    isSelected
                      ? isDark ? 'text-violet-200' : 'text-violet-700'
                      : isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {drone.name ?? drone.drone_id}
                  </span>
                  {drone.model && (
                    <span className={`text-[10px] truncate block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {drone.model}
                    </span>
                  )}
                </div>
              </div>
              <StatusDot status={drone.status} />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="min-w-0 overflow-hidden">
                <FiArrowUp className={`w-3 h-3 mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold font-mono block truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {Math.round(drone.altitude)}m
                </span>
              </div>
              <div className="min-w-0 overflow-hidden">
                <FiZap className={`w-3 h-3 mb-0.5 ${
                  drone.battery_percentage > 50 ? 'text-emerald-500' : drone.battery_percentage > 20 ? 'text-amber-500' : 'text-red-500'
                }`} />
                <span className={`text-xs font-semibold font-mono block truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {Math.round(drone.battery_percentage)}%
                </span>
              </div>
              <div className="min-w-0 overflow-hidden">
                <FiWifi className={`w-3 h-3 mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold font-mono block truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {drone.signal_strength != null ? `${Math.round(drone.signal_strength)}%` : '—'}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <BatteryBar pct={drone.battery_percentage} isDark={isDark} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
