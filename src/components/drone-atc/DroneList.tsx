'use client';

import type { TelemetryData, DroneMap } from './useDroneATCSocket';

interface DroneListProps {
  drones: DroneMap;
  selectedDroneId: string | null;
  onSelect: (id: string) => void;
  isDark: boolean;
}

function BatteryBar({ pct }: { pct: number }) {
  const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{pct}%</span>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const online = status === 'online' || !status;
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
  );
}

export default function DroneList({ drones, selectedDroneId, onSelect, isDark }: DroneListProps) {
  const droneList = Object.values(drones);

  if (droneList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
        <span className="text-2xl mb-2">📡</span>
        Waiting for drones…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {droneList.map((drone: TelemetryData) => {
        const isSelected = drone.drone_id === selectedDroneId;
        return (
          <button
            key={drone.drone_id}
            onClick={() => onSelect(drone.drone_id)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : isDark
                  ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <StatusDot status={drone.status} />
                <span className={`text-sm font-medium truncate max-w-[100px] ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {drone.name ?? drone.drone_id}
                </span>
              </div>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {Math.round(drone.altitude)}m
              </span>
            </div>
            <BatteryBar pct={drone.battery_percentage} />
            {drone.model && (
              <p className="text-xs text-slate-400 mt-1 truncate">{drone.model}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
