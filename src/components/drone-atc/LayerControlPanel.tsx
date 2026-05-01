'use client';

import {
  AlertCircle, ChevronDown, ChevronRight,
  Cloud, Droplets, Gauge, Layers, Plane, Thermometer, Wind,
} from 'lucide-react';
import { useState } from 'react';
import { TbDrone } from 'react-icons/tb';

export interface LayerVisibility {
  drones: boolean;
  flights: boolean;
  airspaceA: boolean;
  airspaceB: boolean;
  airspaceC: boolean;
  airspaceD: boolean;
  wind: boolean;
  temp: boolean;
  clouds: boolean;
  precip: boolean;
  pressure: boolean;
}

interface Props {
  layers: LayerVisibility;
  onToggle: (key: keyof LayerVisibility) => void;
  isDark: boolean;
  droneCount: number;
  aircraftCount: number;
  hasOwmKey: boolean;
}

function Toggle({ on, onChange, disabled, isDark }: { on: boolean; onChange: () => void; disabled?: boolean; isDark: boolean }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); if (!disabled) onChange(); }}
      disabled={disabled}
      aria-checked={on}
      role="switch"
      className={`relative shrink-0 w-8 h-4.5 rounded-full transition-colors duration-200 focus:outline-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${on && !disabled ? 'bg-violet-500' : isDark ? 'bg-slate-700' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        on && !disabled ? 'translate-x-4.5' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

function ToggleRow({
  icon, label, sublabel, count, active, onToggle, disabled, accentColor, isDark,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  count?: number;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  accentColor: string;
  isDark: boolean;
}) {
  const isActive = active && !disabled;
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all select-none ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${isActive
        ? isDark ? 'bg-slate-700/70' : 'bg-slate-50'
        : isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50/80'
      }`}
    >
      {/* Accent dot */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
        style={{ backgroundColor: isActive ? accentColor : isDark ? '#374151' : '#d1d5db' }}
      />

      {/* Icon */}
      <span
        className="w-3.5 h-3.5 shrink-0 transition-colors"
        style={{ color: isActive ? accentColor : isDark ? '#64748b' : '#9ca3af' }}
      >
        {icon}
      </span>

      {/* Label + sublabel */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-none truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {label}
        </p>
        {sublabel && (
          <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {sublabel}
          </p>
        )}
      </div>

      {/* Count chip */}
      {count !== undefined && count > 0 && isActive && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: accentColor + '22', color: accentColor }}
        >
          {count}
        </span>
      )}

      <Toggle on={active} onChange={onToggle} disabled={disabled} isDark={isDark} />
    </div>
  );
}

const CLASS_META: Record<string, { color: string; label: string; desc: string }> = {
  A: { color: '#ef4444', label: 'Class A', desc: 'FL180+' },
  B: { color: '#3b82f6', label: 'Class B', desc: 'Surface–10,000 ft' },
  C: { color: '#a855f7', label: 'Class C', desc: 'Surface–4,000 ft' },
  D: { color: '#06b6d4', label: 'Class D', desc: 'Surface–2,500 ft' },
};

function ClassBadge({ cls }: { cls: string }) {
  const m = CLASS_META[cls];
  return (
    <span
      className="inline-flex items-center justify-center w-4.5 h-3.5 rounded text-[8px] font-black shrink-0"
      style={{ backgroundColor: m.color + '22', border: `1px solid ${m.color}55`, color: m.color }}
    >
      {cls}
    </span>
  );
}

function Section({ label, open, onToggle, isDark }: { label: string; open: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors ${
        isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.15em]">{label}</span>
      {open
        ? <ChevronDown className="w-3 h-3" />
        : <ChevronRight className="w-3 h-3" />}
    </button>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return <div className={`h-px mx-3 ${isDark ? 'bg-slate-700/60' : 'bg-slate-100'}`} />;
}

export default function LayerControlPanel({ layers, onToggle, isDark, droneCount, aircraftCount, hasOwmKey }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [open, setOpen] = useState({ traffic: true, airspace: true, weather: false });
  const toggle = (s: keyof typeof open) => setOpen(p => ({ ...p, [s]: !p[s] }));

  const glass = isDark
    ? 'bg-slate-900/95 border border-slate-700/60 shadow-2xl shadow-black/40 backdrop-blur-xl'
    : 'bg-white/97 border border-slate-200/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl';

  if (collapsed) {
    return (
      <div className="absolute top-3 right-3 z-[450]">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${glass} ${
            isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold">Layers</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`absolute top-3 right-3 z-[450] w-56 rounded-2xl overflow-hidden ${glass}`}>

      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-3 py-2.5 ${isDark ? 'border-b border-slate-700/60' : 'border-b border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
            <Layers className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
          </div>
          <span className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Map Layers
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
            isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="py-1.5 space-y-0.5">

        {/* ── Traffic ── */}
        <Section label="Traffic" open={open.traffic} onToggle={() => toggle('traffic')} isDark={isDark} />
        {open.traffic && (
          <div className="pb-1">
            <ToggleRow
              icon={<TbDrone className="w-full h-full" />}
              label="Drones"
              sublabel="Live fleet telemetry"
              count={droneCount}
              active={layers.drones}
              onToggle={() => onToggle('drones')}
              accentColor="#8b5cf6"
              isDark={isDark}
            />
            <ToggleRow
              icon={<Plane className="w-full h-full" />}
              label="Aircraft"
              sublabel="OpenSky Network"
              count={aircraftCount}
              active={layers.flights}
              onToggle={() => onToggle('flights')}
              accentColor="#f59e0b"
              isDark={isDark}
            />
          </div>
        )}

        <Divider isDark={isDark} />

        <Section label="Airspace" open={open.airspace} onToggle={() => toggle('airspace')} isDark={isDark} />
        {open.airspace && (
          <div className="pb-1">
            {(['A', 'B', 'C', 'D'] as const).map(cls => {
              const m = CLASS_META[cls];
              return (
                <ToggleRow
                  key={cls}
                  icon={<ClassBadge cls={cls} />}
                  label={m.label}
                  sublabel={m.desc}
                  active={layers[`airspace${cls}` as keyof LayerVisibility] as boolean}
                  onToggle={() => onToggle(`airspace${cls}` as keyof LayerVisibility)}
                  accentColor={m.color}
                  isDark={isDark}
                />
              );
            })}
          </div>
        )}

        <Divider isDark={isDark} />

        <Section label="Weather" open={open.weather} onToggle={() => toggle('weather')} isDark={isDark} />
        {open.weather && (
          <div className="pb-1">
            {!hasOwmKey && (
              <div className={`mx-3 mb-1.5 flex items-start gap-1.5 px-2 py-1.5 rounded-lg text-[10px] ${
                isDark ? 'bg-amber-900/20 border border-amber-700/30 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}>
                <AlertCircle className="w-3 h-3 mt-px shrink-0" />
                <span>Set <span className="font-mono font-bold">NEXT_PUBLIC_OWM_API_KEY</span> to enable weather layers.</span>
              </div>
            )}
            <ToggleRow icon={<Wind className="w-full h-full" />}        label="Wind"        sublabel="Animated flow"     active={layers.wind}     onToggle={() => onToggle('wind')}                   accentColor="#3b82f6" isDark={isDark} />
            <ToggleRow icon={<Thermometer className="w-full h-full" />} label="Temperature" sublabel="Surface °C"        active={layers.temp}     onToggle={() => onToggle('temp')}     disabled={!hasOwmKey} accentColor="#ef4444" isDark={isDark} />
            <ToggleRow icon={<Cloud className="w-full h-full" />}       label="Clouds"      sublabel="Cloud cover %"     active={layers.clouds}   onToggle={() => onToggle('clouds')}   disabled={!hasOwmKey} accentColor="#94a3b8" isDark={isDark} />
            <ToggleRow icon={<Droplets className="w-full h-full" />}    label="Precip"      sublabel="Rain & snow mm/h"  active={layers.precip}   onToggle={() => onToggle('precip')}   disabled={!hasOwmKey} accentColor="#06b6d4" isDark={isDark} />
            <ToggleRow icon={<Gauge className="w-full h-full" />}       label="Pressure"    sublabel="Atmospheric hPa"   active={layers.pressure} onToggle={() => onToggle('pressure')} disabled={!hasOwmKey} accentColor="#a855f7" isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  );
}
