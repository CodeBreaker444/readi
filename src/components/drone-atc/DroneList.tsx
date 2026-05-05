'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { FiArrowUp, FiNavigation, FiWifi, FiZap } from 'react-icons/fi';
import { GiDeliveryDrone } from 'react-icons/gi';
import type { DroneMap, TelemetryData } from './useDroneATCSocket';

interface DroneListProps {
  drones: DroneMap;
  selectedDroneId: string | null;
  onSelect: (id: string) => void;
  isDark: boolean;
  isLoading?: boolean;
}

function StatusBadge({ status, isDark }: { status?: string; isDark: boolean }) {
  const online  = status === 'online' || !status;
  const standby = status === 'standby';

  if (online) return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${
      isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      LIVE
    </span>
  );
  if (standby) return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${
      isDark ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      STANDBY
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${
      isDark ? 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/30' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      OFFLINE
    </span>
  );
}

function BatteryBar({ pct, isDark }: { pct: number; isDark: boolean }) {
  const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className={`flex-1 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700/60' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] shrink-0 font-mono w-7 text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function MetricCell({ icon, value, isDark }: { icon: React.ReactNode; value: string; isDark: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg ${
      isDark ? 'bg-slate-800/50' : 'bg-slate-50'
    }`}>
      <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{icon}</span>
      <span className={`text-[11px] font-semibold font-mono leading-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
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
            <Skeleton className={`h-3.5 w-24 mb-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <Skeleton className={`h-2.5 w-14 ${isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`} />
          </div>
        </div>
        <Skeleton className={`h-4 w-12 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
      </div>
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {[1,2,3,4].map(i => (
          <Skeleton key={i} className={`h-10 rounded-lg ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
        ))}
      </div>
      <Skeleton className={`h-1 w-full mt-2 rounded-full ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
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
    <div className="flex flex-col gap-2">
      {droneList.map((drone: TelemetryData) => {
        const isSelected = drone.drone_id === selectedDroneId;
        const online = drone.status === 'online' || !drone.status;
        const standby = drone.status === 'standby';
        const noGps = !drone.latitude && !drone.longitude;

        const borderColor = isSelected
          ? 'border-l-violet-500'
          : noGps    ? 'border-l-slate-400/40'
          : online  ? 'border-l-emerald-500'
          : standby ? 'border-l-amber-400'
          : 'border-l-slate-500';

        const cardBg = isSelected
          ? isDark
            ? 'bg-violet-900/15 border border-l-0 border-violet-500/30 shadow-sm shadow-violet-900/20'
            : 'bg-violet-50/80 border border-l-0 border-violet-200 shadow-sm'
          : noGps
            ? isDark
              ? 'bg-slate-800/20 border border-l-0 border-slate-700/30 opacity-50'
              : 'bg-slate-50/60 border border-l-0 border-slate-200/60 opacity-50'
          : isDark
            ? 'bg-slate-800/30 border border-l-0 border-slate-700/40 hover:bg-slate-800/50 hover:border-slate-600/50'
            : 'bg-white border border-l-0 border-slate-200 hover:bg-slate-50 hover:border-slate-300';

        const speedKts = drone.velocity != null ? Math.round(drone.velocity * 1.944) : null;

        return (
          <button
            key={drone.drone_id}
            onClick={noGps ? undefined : () => onSelect(drone.drone_id)}
            disabled={noGps}
            className={`w-full text-left p-3 rounded-xl border-l-[3px] transition-all duration-150 ${noGps ? 'cursor-default pointer-events-none' : 'cursor-pointer'} ${borderColor} ${cardBg}`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
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
                  <span className={`text-[12px] font-semibold truncate block leading-tight ${
                    isSelected
                      ? isDark ? 'text-violet-200' : 'text-violet-700'
                      : isDark ? 'text-slate-100' : 'text-slate-800'
                  }`}>
                    {drone.name ?? drone.drone_id}
                  </span>
                  {drone.model ? (
                    <span className={`text-[10px] truncate block leading-tight mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {drone.model}
                    </span>
                  ) : (
                    <span className={`text-[9px] font-mono truncate block leading-tight mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                      {drone.drone_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={drone.status} isDark={isDark} />
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-4 gap-1.5">
              <MetricCell
                icon={<FiArrowUp className="w-2.5 h-2.5" />}
                value={`${Math.round(drone.altitude)}m`}
                isDark={isDark}
              />
              <MetricCell
                icon={<FiNavigation className="w-2.5 h-2.5" />}
                value={speedKts != null ? `${speedKts}kt` : '—'}
                isDark={isDark}
              />
              <MetricCell
                icon={<FiZap className={`w-2.5 h-2.5 ${
                  drone.battery_percentage > 50 ? 'text-emerald-500' : drone.battery_percentage > 20 ? 'text-amber-500' : 'text-red-500'
                }`} />}
                value={`${Math.round(drone.battery_percentage)}%`}
                isDark={isDark}
              />
              <MetricCell
                icon={<FiWifi className="w-2.5 h-2.5" />}
                value={drone.signal_strength != null ? `${Math.round(drone.signal_strength)}%` : '—'}
                isDark={isDark}
              />
            </div>

            {/* Battery bar */}
            <div className="mt-2">
              <BatteryBar pct={drone.battery_percentage} isDark={isDark} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
