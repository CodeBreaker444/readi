'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HiChip,
  HiClock,
  HiLocationMarker,
  HiOutlineDocumentText,
} from 'react-icons/hi';

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

interface GutmaPreview {
  flight_id: string;
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
  waypoints: Array<{
    timestamp?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
  }>;
  total_waypoints: number;
  start_time?: string;
  end_time?: string;
  raw_filename?: string;
}

interface Props {
  flight: Flight;
  preview: GutmaPreview | null;
  loading: boolean;
  isDark: boolean;
}

function formatMs(ms?: number): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(secs?: number): string {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDistance(m?: number): string {
  if (m == null) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export function GutmaPreviewPanel({ flight, preview, loading, isDark }: Props) {
  const card = isDark ? 'bg-[#0c0f1a] border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const sectionBg = isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200';
  const tableBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  return (
    <div className={`rounded-xl border overflow-hidden ${card}`}>
      {/* Panel header */}
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <HiOutlineDocumentText className={`w-4 h-4 ${textSecondary}`} />
          <span className={`text-xs font-semibold ${textPrimary}`}>
            {flight.flight_name ?? flight.flight_id}
          </span>
        </div>
        {preview?.raw_filename && (
          <span className={`text-[10px] font-mono ${textSecondary}`}>{preview.raw_filename}</span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Flight summary row */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3`}>
          <StatBox label="Start time" value={formatMs(flight.start_time)} isDark={isDark} />
          <StatBox label="End time" value={formatMs(flight.end_time)} isDark={isDark} />
          <StatBox label="Duration" value={formatDuration(flight.duration)} isDark={isDark} />
          <StatBox label="Distance" value={formatDistance(flight.distance)} isDark={isDark} />
        </div>

        {/* Flight meta */}
        {(flight.drone_name || flight.pilot_name || flight.mission_name) && (
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3`}>
            {flight.drone_name && (
              <StatBox label="Drone" value={flight.drone_name} isDark={isDark} />
            )}
            {flight.pilot_name && (
              <StatBox label="Pilot" value={flight.pilot_name} isDark={isDark} />
            )}
            {flight.mission_name && (
              <StatBox label="Mission" value={flight.mission_name} isDark={isDark} />
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Downloading GUTMA log from FlytBase — this may take up to a minute…
            </div>
            <div className="space-y-3">
              <Skeleton className={`h-4 w-1/3 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <Skeleton className={`h-24 w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <Skeleton className={`h-4 w-1/4 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <Skeleton className={`h-40 w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            </div>
          </div>
        )}

        {!loading && preview && (
          <>
            {/* Aircraft info */}
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

            {/* GCS info */}
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

            {/* Waypoints table */}
            {preview.waypoints.length > 0 && (
              <Section
                title={`Flight Path`}
                subtitle={`${preview.waypoints.length} of ${preview.total_waypoints} points shown`}
                icon={<HiClock className="w-3.5 h-3.5" />}
                isDark={isDark}
              >
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className={`border-b ${tableBorder}`}>
                        {['#', 'Timestamp', 'Latitude', 'Longitude', 'Alt (m)', 'Speed (m/s)', 'Heading'].map((h) => (
                          <th key={h} className={`px-3 py-2 text-left font-medium uppercase tracking-wider ${textSecondary}`}>
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
                            {wp.latitude != null ? wp.latitude.toFixed(6) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.longitude != null ? wp.longitude.toFixed(6) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.altitude != null ? wp.altitude.toFixed(1) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.speed != null ? wp.speed.toFixed(2) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 font-mono ${textPrimary}`}>
                            {wp.heading != null ? `${wp.heading.toFixed(1)}°` : '—'}
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
            )}

            {/* No flight path data */}
            {preview.waypoints.length === 0 && (
              <div className={`rounded-lg border p-4 text-center ${sectionBg}`}>
                <p className={`text-xs ${textSecondary}`}>No waypoint data found in this GUTMA file.</p>
              </div>
            )}
          </>
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
