'use client';

import { Skeleton } from '@/components/ui/skeleton';
import '@/lib/i18n/config';
import { useState } from 'react';
import { FiArrowUp, FiNavigation, FiSearch, FiWifi, FiZap } from 'react-icons/fi';
import { GiDeliveryDrone } from 'react-icons/gi';
import { MdDock } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import type { DroneMap, TelemetryData } from './useDroneATCSocket';

interface DroneListProps {
  drones: DroneMap;
  docks: DroneMap;
  selectedDroneId: string | null;
  onSelect: (id: string) => void;
  isDark: boolean;
  isLoading?: boolean;
  userRole?: string | null;
}

function StatusBadge({ status, isDark }: { status?: string; isDark: boolean }) {
  const { t } = useTranslation();
  const online  = status === 'online' || !status;
  const standby = status === 'standby';

  if (online) return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${
      isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      {t('droneAtc.droneList.live')}
    </span>
  );
  if (standby) return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${
      isDark ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      {t('droneAtc.droneList.standby')}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${
      isDark ? 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/30' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {t('droneAtc.droneList.offline')}
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
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className={`h-10 rounded-lg ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
        ))}
      </div>
      <Skeleton className={`h-1 w-full mt-2 rounded-full ${isDark ? 'bg-slate-700/40' : 'bg-slate-100'}`} />
    </div>
  );
}

function EmptyState({ isDark, type }: { isDark: boolean; type: 'drone' | 'dock' }) {
  const { t } = useTranslation();
  const isDrone = type === 'drone';
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <div className="relative">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
          isDark ? 'bg-violet-950/50 border border-violet-800/30' : 'bg-violet-50 border border-violet-200'
        }`}>
          {isDrone
            ? <GiDeliveryDrone className={`w-6 h-6 ${isDark ? 'text-violet-500' : 'text-violet-400'}`} />
            : <MdDock className={`w-6 h-6 ${isDark ? 'text-violet-500' : 'text-violet-400'}`} />}
        </div>
        <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-ping" />
      </div>
      <div className="text-center">
        <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          {isDrone ? t('droneAtc.droneList.noActiveDrones') : 'No active docks'}
        </p>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {isDrone ? t('droneAtc.droneList.scanningAirspace') : 'No docks connected'}
        </p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500/70 animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}

function PilotHeader({ pilotName, isDark }: { pilotName: string; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-1 pt-3 pb-1 first:pt-0`}>
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? 'bg-violet-500' : 'bg-violet-400'}`} />
      <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {pilotName.toUpperCase()}
      </span>
      <div className={`flex-1 h-px ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
    </div>
  );
}

function DroneCard({
  drone,
  isSelected,
  onSelect,
  isDark,
  showUser,
}: {
  drone: TelemetryData;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
  showUser: boolean;
}) {
  const { t } = useTranslation();
  const online  = drone.status === 'online' || !drone.status;
  const standby = drone.status === 'standby';
  const noGps   = !drone.latitude && !drone.longitude;

  const borderColor = isSelected
    ? 'border-l-violet-500'
    : noGps    ? 'border-l-slate-400/40'
    : online   ? 'border-l-emerald-500'
    : standby  ? 'border-l-amber-400'
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
  const ownerLabel = drone.user_details?.fullname || drone.user_details?.email;

  return (
    <button
      onClick={noGps ? undefined : onSelect}
      disabled={noGps}
      className={`w-full text-left p-3 rounded-xl border-l-[3px] transition-all duration-150 ${noGps ? 'cursor-default pointer-events-none' : 'cursor-pointer'} ${borderColor} ${cardBg}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isSelected
              ? isDark ? 'bg-violet-500/15 ring-1 ring-violet-500/30' : 'bg-violet-100 ring-1 ring-violet-200'
              : isDark ? 'bg-slate-700/50' : 'bg-slate-100'
          }`}>
            <GiDeliveryDrone className={`w-4 h-4 ${isSelected ? 'text-violet-400' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          </div>
          <div className="min-w-0">
            <span className={`text-[12px] font-semibold truncate block leading-tight ${
              isSelected
                ? isDark ? 'text-violet-200' : 'text-violet-700'
                : isDark ? 'text-slate-100' : 'text-slate-800'
            }`}>
              {drone.tool_code ?? drone.name ?? drone.drone_id}
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
            {showUser && ownerLabel && (
              <span className={`text-[9px] truncate block leading-tight mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {ownerLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={drone.status} isDark={isDark} />
          {noGps && (
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${
              isDark ? 'bg-slate-700/60 text-slate-400 ring-1 ring-slate-600/30' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
            }`}>
              {t('droneAtc.droneList.noGps')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <MetricCell icon={<FiArrowUp className="w-2.5 h-2.5" />}     value={`${Math.round(drone.altitude)}m`} isDark={isDark} />
        <MetricCell icon={<FiNavigation className="w-2.5 h-2.5" />}  value={speedKts != null ? `${speedKts}kt` : '—'} isDark={isDark} />
        <MetricCell
          icon={<FiZap className={`w-2.5 h-2.5 ${drone.battery_percentage > 50 ? 'text-emerald-500' : drone.battery_percentage > 20 ? 'text-amber-500' : 'text-red-500'}`} />}
          value={`${Math.round(drone.battery_percentage)}%`}
          isDark={isDark}
        />
        <MetricCell icon={<FiWifi className="w-2.5 h-2.5" />} value={drone.signal_strength != null ? `${Math.round(drone.signal_strength)}%` : '—'} isDark={isDark} />
      </div>

      <div className="mt-2">
        <BatteryBar pct={drone.battery_percentage} isDark={isDark} />
      </div>
    </button>
  );
}

function DockCard({ dock, isDark, showUser }: { dock: TelemetryData; isDark: boolean; showUser: boolean }) {
  const online  = dock.status === 'online' || !dock.status;
  const standby = dock.status === 'standby';
  const ownerLabel = dock.user_details?.fullname || dock.user_details?.email;

  const borderColor = online ? 'border-l-cyan-500' : standby ? 'border-l-amber-400' : 'border-l-slate-500';
  const cardBg = isDark
    ? 'bg-slate-800/30 border border-l-0 border-slate-700/40'
    : 'bg-white border border-l-0 border-slate-200';

  return (
    <div className={`p-3 rounded-xl border-l-[3px] ${borderColor} ${cardBg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-cyan-500/10 ring-1 ring-cyan-500/20' : 'bg-cyan-50 ring-1 ring-cyan-200'}`}>
            <MdDock className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-500'}`} />
          </div>
          <div className="min-w-0">
            <span className={`text-[12px] font-semibold truncate block leading-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {dock.tool_code ?? dock.name ?? dock.drone_id}
            </span>
            {dock.model && (
              <span className={`text-[10px] truncate block leading-tight mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {dock.model}
              </span>
            )}
            {showUser && ownerLabel && (
              <span className={`text-[9px] truncate block leading-tight mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {ownerLabel}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={dock.status} isDark={isDark} />
      </div>
    </div>
  );
}

export default function DroneList({
  drones,
  docks,
  selectedDroneId,
  onSelect,
  isDark,
  isLoading,
  userRole,
}: DroneListProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'drone' | 'dock'>('drone');
  const [userFilter, setUserFilter] = useState('');

  const isSuperAdmin = userRole === 'SUPERADMIN';
  const isAdmin      = userRole === 'ADMIN' || isSuperAdmin;

  const droneList = Object.values(drones);
  const dockList  = Object.values(docks);

  const tabCounts = { drone: droneList.length, dock: dockList.length };

  const filteredDrones = isAdmin && userFilter.trim()
    ? droneList.filter(d => {
        const q = userFilter.toLowerCase();
        return (
          d.user_details?.fullname?.toLowerCase().includes(q) ||
          d.user_details?.email?.toLowerCase().includes(q)
        );
      })
    : droneList;

  const groupedDrones: Map<string, TelemetryData[]> = filteredDrones.reduce((map, d) => {
    const pilot = d.pilot_name ?? 'Unknown';
    map.set(pilot, [...(map.get(pilot) ?? []), d]);
    return map;
  }, new Map<string, TelemetryData[]>());

  const tabBase = `flex-1 py-1.5 text-[10px] font-bold tracking-wide rounded-lg transition-all flex items-center justify-center gap-1.5`;
  const tabActive = isDark
    ? 'bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30'
    : 'bg-violet-100 text-violet-700 ring-1 ring-violet-200';
  const tabInactive = isDark
    ? 'text-slate-500 hover:text-slate-300'
    : 'text-slate-400 hover:text-slate-600';

  if (isLoading && droneList.length === 0 && dockList.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3].map(i => <DroneCardSkeleton key={i} isDark={isDark} />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Drone / Dock tabs */}
      <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
        <button
          onClick={() => setActiveTab('drone')}
          className={`${tabBase} ${activeTab === 'drone' ? tabActive : tabInactive}`}
        >
          <GiDeliveryDrone className="w-3 h-3" />
          Drones
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
            activeTab === 'drone'
              ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-200 text-violet-600'
              : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
          }`}>{tabCounts.drone}</span>
        </button>
        <button
          onClick={() => setActiveTab('dock')}
          className={`${tabBase} ${activeTab === 'dock' ? tabActive : tabInactive}`}
        >
          <MdDock className="w-3 h-3" />
          Docks
          <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
            activeTab === 'dock'
              ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-200 text-violet-600'
              : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
          }`}>{tabCounts.dock}</span>
        </button>
      </div>

      {/* Admin user filter (shown only when on drone tab) */}
      {isAdmin && activeTab === 'drone' && droneList.length > 0 && (
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ring-1 ${
          isDark ? 'bg-slate-800/40 ring-slate-700/40' : 'bg-white ring-slate-200'
        }`}>
          <FiSearch className={`w-3 h-3 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Filter by user..."
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className={`flex-1 text-[11px] bg-transparent outline-none ${isDark ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-700 placeholder:text-slate-400'}`}
          />
          {userFilter && (
            <button onClick={() => setUserFilter('')} className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>✕</button>
          )}
        </div>
      )}

      {/* Drone list */}
      {activeTab === 'drone' && (
        filteredDrones.length === 0
          ? <EmptyState isDark={isDark} type="drone" />
          : (
            <div className="flex flex-col">
              {Array.from(groupedDrones.entries()).map(([pilotName, items]) => (
                <div key={pilotName}>
                  <PilotHeader pilotName={pilotName} isDark={isDark} />
                  <div className="flex flex-col gap-2">
                    {items.map(drone => (
                      <DroneCard
                        key={drone.drone_id}
                        drone={drone}
                        isSelected={drone.drone_id === selectedDroneId}
                        onSelect={() => onSelect(drone.drone_id)}
                        isDark={isDark}
                        showUser={isAdmin}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {/* Dock list */}
      {activeTab === 'dock' && (
        dockList.length === 0
          ? <EmptyState isDark={isDark} type="dock" />
          : (
            <div className="flex flex-col">
              {Array.from(
                dockList.reduce((map, d) => {
                  const pilot = d.pilot_name ?? 'Unknown';
                  map.set(pilot, [...(map.get(pilot) ?? []), d]);
                  return map;
                }, new Map<string, TelemetryData[]>()).entries(),
              ).map(([pilotName, items]) => (
                <div key={pilotName}>
                  <PilotHeader pilotName={pilotName} isDark={isDark} />
                  <div className="flex flex-col gap-2">
                    {items.map(dock => (
                      <DockCard key={dock.drone_id} dock={dock} isDark={isDark} showUser={isAdmin} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}
