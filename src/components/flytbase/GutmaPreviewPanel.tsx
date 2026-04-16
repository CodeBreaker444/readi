'use client';

import type { FlightWaypoint } from '@/components/flytbase/FlightPathMap';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  HiChip,
  HiClock,
  HiFlag,
  HiInformationCircle,
  HiLocationMarker,
  HiMap,
  HiOutlineDocumentText,
  HiTable,
  HiUser,
} from 'react-icons/hi';

const FlightPathMapDynamic = dynamic(
  () => import('@/components/flytbase/FlightPathMap').then((m) => ({ default: m.FlightPathMap })),
  { ssr: false },
);

interface Flight {
  flight_id: string;
  flight_name?: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
  distance?: number;
  drone_name?: string;
  pilot_name?: string;
  mission_name?: string;
}

interface GutmaEvent {
  event_type?: string;
  event_info?: string;
  event_timestamp?: string | number;
  controller_name?: string;
  controller_type?: string;
}

interface GutmaPayloadItem {
  model?: string;
  serial_number?: string;
  firmware_version?: string;
  cycle_count?: number;
  design_capacity?: number;
  type?: string;
}

interface GutmaPreview {
  flight_id: string;
  filename?: string;
  aircraft?: {
    serial_number?: string;
    product_name?: string;
    firmware_version?: string;
    model?: string;
    manufacturer?: string;
  };
  gcs?: {
    type?: string;
    name?: string;
    serial_number?: string;
  };
  pilot?: string | null;
  logging_start?: string | null;
  events?: GutmaEvent[];
  payload?: GutmaPayloadItem[];
  waypoints: FlightWaypoint[];
  total_waypoints: number;
  start_time?: string;
  end_time?: string;
}

interface Props {
  flight: Flight;
  preview: GutmaPreview | null;
  loading: boolean;
  isDark: boolean;
  previewError?: string | null;
  canArchive?: boolean;
  archiving?: boolean;
  archived?: boolean;
  archiveError?: { message: string; missing_sns: string[] } | null;
  onArchive?: () => void;
}
 

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export function GutmaPreviewPanel({
  flight, preview, loading, isDark, previewError,
  canArchive, archiving, archived, archiveError, onArchive,
}: Props) {
  const [tab, setTab] = useState<'map' | 'gutma' | 'info'>('map');

  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const sectionBg = isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200';
  const tableBorder = isDark ? 'border-slate-800' : 'border-slate-200';
  const tabBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  const hasMap = !!(
    preview?.waypoints &&
    preview.waypoints.some((wp) => wp.latitude != null && wp.longitude != null)
  );

  function TabButton({ id, icon, label }: { id: 'map' | 'gutma' | 'info'; icon: React.ReactNode; label: string }) {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
          active
            ? 'border-violet-500 text-violet-500'
            : `border-transparent ${textSecondary} hover:${textPrimary}`
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${card}`}>
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${tabBorder}`}>
        <div className="flex items-center gap-2">
          <HiOutlineDocumentText className={`w-4 h-4 ${textSecondary}`} />
          <span className={`text-xs font-semibold ${textPrimary}`}>
            {flight.flight_name ?? flight.flight_id}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* File name + size */}
          {preview?.filename && (
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono ${textSecondary}`}>{preview.filename}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>·</span>
              <span className={`text-[10px] font-mono ${textSecondary}`}>
                {formatBytes(JSON.stringify(preview).length)}
              </span>
            </div>
          )}

          {/* Storage status badge */}
          {archived ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved to S3
            </span>
          ) : preview && !loading ? (
            <span className={`text-[11px] font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Not saved
            </span>
          ) : null}

          {/* Archive button */}
          {canArchive && !archived && (
            <button
              onClick={onArchive}
              disabled={archiving}
              className="h-7 px-3 rounded text-[11px] font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white flex items-center gap-1.5"
            >
              {archiving && (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {archiving ? 'Archiving…' : 'Archive to Readi'}
            </button>
          )}
        </div>
      </div>

      {/* Serial-number validation error — shown inline below the header */}
      {archiveError && (
        <div className={`flex items-start gap-3 px-5 py-3 border-b text-xs ${isDark ? 'bg-red-950/20 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
          <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>{archiveError.message}</p>
            {archiveError.missing_sns.length > 0 && (
              <ul className={`mt-1 space-y-0.5 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {archiveError.missing_sns.map((sn) => (
                  <li key={sn} className="font-mono">{sn}</li>
                ))}
              </ul>
            )}
            <p className={`mt-1 ${isDark ? 'text-red-500' : 'text-red-500'}`}>
              Register these serial numbers in your equipment inventory before archiving.
            </p>
          </div>
        </div>
      )}

      {!loading && preview && (
        <div className={`flex border-b ${tabBorder} px-3`}>
          <TabButton id="map"   icon={<HiMap               className="w-3.5 h-3.5" />} label="Map" />
          <TabButton id="gutma" icon={<HiTable             className="w-3.5 h-3.5" />} label="GUTMA Log" />
          <TabButton id="info"  icon={<HiInformationCircle className="w-3.5 h-3.5" />} label="Flight Info" />
        </div>
      )}

      <div className="p-5">
        {loading && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2.5 text-xs ${textSecondary}`}>
              <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Downloading GUTMA log from FlytBase…
            </div>
            <Skeleton className={`h-95 w-full rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          </div>
        )}

        {!loading && !preview && previewError && (
          <div className={`rounded-lg border p-6 flex flex-col items-center gap-3 text-center ${isDark ? 'bg-red-950/20 border-red-800/30' : 'bg-red-50 border-red-200'}`}>
            <svg className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className={`text-xs font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>{previewError}</p>
          </div>
        )}

        {!loading && preview && tab === 'map' && (
          <div className="space-y-5">
            {hasMap ? (
              <div className="relative">
                <FlightPathMapDynamic
                  waypoints={preview.waypoints}
                  height="420px"
                  isDark={isDark}
                />
                {(flight.pilot_name || preview.pilot || flight.drone_name || preview.aircraft?.product_name || preview.aircraft?.model) && (
                  <div className="absolute bottom-3 left-3 z-400 opacity-20 pointer-events-none select-none">
                    <div className="rounded-lg px-3 py-2.5 bg-slate-900 border border-slate-500 shadow-lg text-white min-w-37.5">
                      {(preview.pilot || flight.pilot_name) && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <HiUser className="w-3 h-3 shrink-0 text-slate-300" />
                          <span className="text-[11px] font-medium truncate">{preview.pilot ?? flight.pilot_name}</span>
                        </div>
                      )}
                      {flight.drone_name && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <HiChip className="w-3 h-3 shrink-0 text-slate-300" />
                          <span className="text-[11px] truncate">{flight.drone_name}</span>
                        </div>
                      )}
                      {preview.aircraft?.product_name && (
                        <p className="text-[10px] text-slate-300 pl-4.5 truncate">
                          {preview.aircraft.product_name}
                        </p>
                      )}
                      {preview.aircraft?.model && (
                        <p className="text-[10px] text-slate-400 pl-4.5 truncate">
                          {preview.aircraft.model}
                        </p>
                      )}
                      {preview.aircraft?.serial_number && (
                        <p className="text-[10px] font-mono text-slate-400 pl-4.5 truncate">
                          {preview.aircraft.serial_number}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`rounded-lg border p-8 text-center ${sectionBg}`}>
                <HiMap className={`w-8 h-8 mx-auto mb-2 ${textSecondary}`} />
                <p className={`text-xs ${textSecondary}`}>No GPS coordinates found in this GUTMA file.</p>
              </div>
            )}
          </div>
        )}

        {!loading && preview && tab === 'info' && (
          <div className="space-y-5">
            {/* Flight metadata — always shown when any field exists */}
            {(flight.pilot_name || preview.pilot || flight.mission_name || flight.start_time || flight.end_time || flight.duration != null || flight.distance != null || preview.logging_start) && (
              <Section title="Flight Details" icon={<HiUser className="w-3.5 h-3.5" />} isDark={isDark}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(preview.pilot || flight.pilot_name) && (
                    <StatBox label="Pilot in Command" value={preview.pilot ?? flight.pilot_name!} isDark={isDark} />
                  )}
                  {flight.mission_name && (
                    <StatBox label="Mission" value={flight.mission_name} isDark={isDark} />
                  )}
                  {flight.start_time && (
                    <StatBox label="Start Time" value={new Date(flight.start_time).toLocaleString()} isDark={isDark} />
                  )}
                  {flight.end_time && (
                    <StatBox label="End Time" value={new Date(flight.end_time).toLocaleString()} isDark={isDark} />
                  )}
                  {flight.duration != null && (
                    <StatBox label="Duration" value={formatDuration(flight.duration)} isDark={isDark} />
                  )}
                  {flight.distance != null && (
                    <StatBox label="Distance" value={formatDistance(flight.distance)} isDark={isDark} />
                  )}
                  {preview.logging_start && (
                    <StatBox label="Logging Start" value={new Date(preview.logging_start).toLocaleString()} isDark={isDark} />
                  )}
                </div>
              </Section>
            )}

            {/* Mission */}
            {flight.mission_name === undefined && flight.drone_name && (
              <Section title="Asset" icon={<HiFlag className="w-3.5 h-3.5" />} isDark={isDark}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {flight.drone_name && <StatBox label="Drone" value={flight.drone_name} isDark={isDark} />}
                </div>
              </Section>
            )}

            {/* Events */}
            {preview.events && preview.events.length > 0 && (
              <Section
                title="Events"
                subtitle={`${preview.events.length} event${preview.events.length !== 1 ? 's' : ''}`}
                icon={<HiClock className="w-3.5 h-3.5" />}
                isDark={isDark}
              >
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className={`border-b ${tableBorder}`}>
                        {['#', 'Timestamp', 'Type', 'Info', 'Controller'].map((h) => (
                          <th key={h} className={`px-3 py-2 text-left font-medium uppercase tracking-wider whitespace-nowrap ${textSecondary}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {preview.events.map((ev, i) => {
                        const ts = ev.event_timestamp;
                        const tsFormatted = ts != null
                          ? (typeof ts === 'number'
                            ? new Date(ts).toISOString().slice(11, 23)
                            : String(ts))
                          : '—';
                        return (
                          <tr key={i} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition-colors`}>
                            <td className={`px-3 py-1.5 font-mono ${textSecondary}`}>{i + 1}</td>
                            <td className={`px-3 py-1.5 font-mono ${textSecondary}`}>{tsFormatted}</td>
                            <td className={`px-3 py-1.5 font-mono font-medium ${textPrimary}`}>{ev.event_type ?? '—'}</td>
                            <td className={`px-3 py-1.5 ${textPrimary}`}>{ev.event_info ?? '—'}</td>
                            <td className={`px-3 py-1.5 font-mono ${textSecondary}`}>
                              {ev.controller_name ?? ev.controller_type ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* Payload / Battery */}
            {preview.payload && preview.payload.length > 0 && (
              <Section
                title="Payload / Battery"
                subtitle={`${preview.payload.length} item${preview.payload.length !== 1 ? 's' : ''}`}
                icon={<HiChip className="w-3.5 h-3.5" />}
                isDark={isDark}
              >
                <div className="space-y-3">
                  {preview.payload.map((item, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                      <p className={`text-[10px] uppercase tracking-wider font-medium mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {item.type ?? `Battery ${i + 1}`}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {item.model && <StatBox label="Model" value={item.model} isDark={isDark} />}
                        {item.serial_number && <StatBox label="Serial Number" value={item.serial_number} isDark={isDark} mono />}
                        {item.firmware_version && <StatBox label="Firmware" value={item.firmware_version} isDark={isDark} mono />}
                        {item.cycle_count != null && <StatBox label="Cycle Count" value={String(item.cycle_count)} isDark={isDark} />}
                        {item.design_capacity != null && <StatBox label="Design Capacity" value={`${item.design_capacity} mAh`} isDark={isDark} />}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Empty state */}
            {!preview.pilot && !preview.logging_start && (!preview.events || preview.events.length === 0) && (!preview.payload || preview.payload.length === 0) && (
              <div className={`rounded-lg border p-8 text-center ${sectionBg}`}>
                <HiInformationCircle className={`w-8 h-8 mx-auto mb-2 ${textSecondary}`} />
                <p className={`text-xs ${textSecondary}`}>No additional flight info available in this GUTMA file.</p>
              </div>
            )}
          </div>
        )}

        {!loading && preview && tab === 'gutma' && (
          <div className="space-y-5">
            {preview.aircraft && Object.values(preview.aircraft).some(Boolean) && (
              <Section title="Aircraft" icon={<HiChip className="w-3.5 h-3.5" />} isDark={isDark}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {preview.aircraft.product_name && (
                    <StatBox label="Name" value={preview.aircraft.product_name} isDark={isDark} />
                  )}
                  {preview.aircraft.model && (
                    <StatBox label="Model" value={preview.aircraft.model} isDark={isDark} />
                  )}
                  {preview.aircraft.manufacturer && (
                    <StatBox label="Manufacturer" value={preview.aircraft.manufacturer} isDark={isDark} />
                  )}
                  {preview.aircraft.serial_number && (
                    <StatBox label="Serial number" value={preview.aircraft.serial_number} isDark={isDark} mono />
                  )}
                  {preview.aircraft.firmware_version && (
                    <StatBox label="Firmware" value={preview.aircraft.firmware_version} isDark={isDark} mono />
                  )}
                </div>
              </Section>
            )}

            {preview.gcs && Object.values(preview.gcs).some(Boolean) && (
              <Section title="Ground Control Station" icon={<HiLocationMarker className="w-3.5 h-3.5" />} isDark={isDark}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {preview.gcs.name && (
                    <StatBox label="Name" value={preview.gcs.name} isDark={isDark} />
                  )}
                  {preview.gcs.type && (
                    <StatBox label="Type" value={preview.gcs.type} isDark={isDark} />
                  )}
                  {preview.gcs.serial_number && (
                    <StatBox label="Serial number" value={preview.gcs.serial_number} isDark={isDark} mono />
                  )}
                </div>
              </Section>
            )}

            {preview.waypoints.length > 0 ? (
              <Section
                title="Waypoint Log"
                subtitle={`${preview.waypoints.length} of ${preview.total_waypoints} points`}
                icon={<HiClock className="w-3.5 h-3.5" />}
                isDark={isDark}
              >
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className={`border-b ${tableBorder}`}>
                        {['#', 'Timestamp', 'Lat', 'Lon', 'Alt (m)', 'Speed', 'Vx/Vy/Vz (m/s)', 'Heading (ψ)', 'Roll (φ)', 'Pitch (θ)', 'Battery'].map((h) => (
                          <th key={h} className={`px-3 py-2 text-left font-medium uppercase tracking-wider whitespace-nowrap ${textSecondary}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {preview.waypoints.map((wp, i) => (
                        <tr key={i} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className={`px-3 py-1.5 font-mono ${textSecondary}`}>{i + 1}</td>
                          <td className={`px-3 py-1.5 font-mono ${textSecondary}`}>
                            {wp.timestamp != null ? new Date(wp.timestamp).toISOString().slice(11, 23) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.latitude  != null ? wp.latitude.toFixed(6)  : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.longitude != null ? wp.longitude.toFixed(6) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.altitude  != null ? wp.altitude.toFixed(1)  : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.speed != null ? wp.speed.toFixed(2) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {[wp.speed_vx, wp.speed_vy, wp.speed_vz]
                              .map((v) => (v != null ? v.toFixed(2) : '—'))
                              .join(' / ')}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.heading    != null ? `${wp.heading.toFixed(1)}°`    : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.angle_phi  != null ? `${wp.angle_phi.toFixed(1)}°`  : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.angle_theta != null ? `${wp.angle_theta.toFixed(1)}°` : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.battery != null ? `${wp.battery.toFixed(0)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.total_waypoints > preview.waypoints.length && (
                  <p className={`text-[11px] mt-2 ${textSecondary}`}>
                    Showing first {preview.waypoints.length} of {preview.total_waypoints} waypoints.
                  </p>
                )}
              </Section>
            ) : (
              <div className={`rounded-lg border p-4 text-center ${sectionBg}`}>
                <p className={`text-xs ${textSecondary}`}>No waypoint data found in this GUTMA file.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label, value, isDark, mono = false,
}: {
  label: string;
  value: string;
  isDark: boolean;
  mono?: boolean;
}) {
  return (
    <div className={`rounded-lg px-3 py-2.5 border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
      <p className={`text-[10px] uppercase tracking-wider font-medium mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
      <p className={`text-xs font-medium truncate ${mono ? 'font-mono' : ''} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title, subtitle, icon, isDark, children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className={textSecondary}>{icon}</span>
        <span className={`text-xs font-semibold ${textPrimary}`}>{title}</span>
        {subtitle && <span className={`text-[11px] ${textSecondary}`}>— {subtitle}</span>}
      </div>
      {children}
    </div>
  );
}
