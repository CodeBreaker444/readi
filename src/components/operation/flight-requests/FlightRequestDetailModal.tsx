'use client';

import { usePermissions } from '@/components/permissions/PermissionsProvider';
import { FlightRequest, ZoneBadge } from '@/components/tables/flightRequestsColumns';
import { Button } from '@/components/ui/button';
import { LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM, LEAFLET_TILE_DARK, LEAFLET_TILE_DARK_LABELS, LEAFLET_TILE_LIGHT, LEAFLET_TILE_LIGHT_LABELS } from '@/lib/leaflet-tiles';
import { boundsOf, checkPointAgainstZones, OperationZones, ZoneWarning } from '@/lib/operation-zones';
import { renderZoneLayers } from '@/lib/operation-zones-leaflet';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, FileUp, Link2, Loader2, MapPin, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoneLegend } from '@/components/system/ZoneLegend';

interface Props {
  request: FlightRequest | null;
  isDark: boolean;
  assigning: number | null;
  denying: number | null;
  onClose: () => void;
  onAcknowledge: (request_id: number) => void;
  onDeny: (request_id: number) => void;
  onOpenLinkModal: (request: FlightRequest) => void;
  onOpenLogModal: (request_id: number, mission_id: string) => void;
}

type Tab = 'details' | 'location' | 'action';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  ASSIGNED: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/30',
  IN_PROGRESS: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/30',
  ISSUE: 'bg-red-500/10 text-red-500 border-red-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

interface ZoneSystem { toolId: number; toolCode: string; operationZones: OperationZones }

const WARNING_TEXT: Record<ZoneWarning['type'], (w: ZoneWarning) => string> = {
  red: (w) => `Waypoint is inside a RED zone${w.zoneName ? ` (${w.zoneName})` : ''}`,
  unsurveyed: (w) => `Waypoint is inside an unsurveyed zone${w.zoneName ? ` (${w.zoneName})` : ''}`,
  outside_perimeter: () => 'Waypoint is outside the operational perimeter',
  not_in_green: () => 'Waypoint is not covered by any green zone',
};

function ZoneWarnings({ systems, waypoint, isDark, scrollable }: { systems: ZoneSystem[]; waypoint: any; isDark: boolean; scrollable?: boolean }) {
  const coords = waypoint?.coordinates as number[] | undefined;
  if (!coords || systems.length === 0) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const rows = systems.map((s) => ({ s, r: checkPointAgainstZones(lat, lng, s.operationZones) }));
  return (
    // Beyond 7 systems, cap the list height (~7 single-line rows) and scroll inside it.
    <div className={`space-y-1.5 mb-4 ${scrollable && rows.length > 7 ? 'max-h-[19rem] overflow-y-auto pr-1' : ''}`}>
      {rows.map(({ s, r }) => {
        const danger = r.warnings.some((w) => w.severity === 'danger');
        const tone = r.clear
          ? (isDark ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-green-200 bg-green-50 text-green-700')
          : danger
            ? (isDark ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700')
            : (isDark ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-800');
        const Icon = r.clear ? CheckCircle2 : danger ? ShieldAlert : AlertTriangle;
        return (
          <div key={s.toolId} role={r.clear ? undefined : 'alert'} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${tone}`}>
            <Icon className="h-4 w-4 shrink-0 mt-px" />
            <div className="min-w-0">
              <span className="font-semibold">{s.toolCode}</span>
              {r.clear
                ? <span> — waypoint is within its operation zones</span>
                : <ul className="list-disc pl-4">{r.warnings.map((w, i) => <li key={i}>{WARNING_TEXT[w.type](w)}</li>)}</ul>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WaypointMap({ waypoint, isDark, zoneSystems }: { waypoint: any; isDark: boolean; zoneSystems: ZoneSystem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!waypoint?.coordinates) return;

    const [lng, lat, alt] = waypoint.coordinates as number[];

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      L.tileLayer(
        isDark ? LEAFLET_TILE_DARK : LEAFLET_TILE_LIGHT,
        { maxZoom: 19, maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM },
      ).addTo(map);
      L.tileLayer(
        isDark ? LEAFLET_TILE_DARK_LABELS : LEAFLET_TILE_LIGHT_LABELS,
        { maxZoom: 19, maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM },
      ).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#7c3aed;border:2px solid #fff;box-shadow:0 0 0 3px rgba(124,58,237,0.35)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const tooltip = `
        <div style="background:${isDark ? '#0f172a' : '#fff'};border:1px solid ${isDark ? '#334155' : '#e2e8f0'};border-radius:8px;padding:8px 12px;font-size:11px;color:${isDark ? '#f1f5f9' : '#0f172a'}">
          <b>Waypoint</b><br/>
          ${lat.toFixed(6)}, ${lng.toFixed(6)}${alt !== undefined ? `<br/>Alt: ${alt} m` : ''}
        </div>`;

      if (zoneSystems.length > 0) {
        const multi = zoneSystems.length > 1;
        zoneSystems.forEach((s) => renderZoneLayers(L as any, L.layerGroup().addTo(map), s.operationZones, { labelPrefix: multi ? s.toolCode : undefined }));
        const pts: [number, number][] = [[lat, lng]];
        zoneSystems.forEach((s) => {
          const b = boundsOf(s.operationZones);
          if (b) pts.push(b[0], b[1]);
        });
        if (pts.length > 1) map.fitBounds(pts, { padding: [24, 24], maxZoom: 16 });
      }

      L.marker([lat, lng], { icon, zIndexOffset: 1000 })
        .bindTooltip(tooltip, { permanent: false, direction: 'top', offset: [0, -10] })
        .addTo(map);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [waypoint, isDark, zoneSystems]);

  if (!waypoint?.coordinates) {
    return (
      <div className={`flex flex-col items-center justify-center h-[320px] rounded-xl border ${isDark ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
        <MapPin className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-sm">No waypoint coordinates available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} style={{ height: 320 }} className="w-full rounded-xl overflow-hidden border border-slate-700/40" />
      <div className={`text-[11px] font-mono text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {(() => {
          const [lng, lat, alt] = waypoint.coordinates as number[];
          return `${lat.toFixed(6)}, ${lng.toFixed(6)}${alt !== undefined ? ` · alt ${alt} m` : ''}`;
        })()}
      </div>
    </div>
  );
}

function DetailRow({ label, value, isDark }: { label: string; value: React.ReactNode; isDark: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={`w-32 shrink-0 text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{label}</span>
      <span className={`flex-1 text-xs ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{value ?? '—'}</span>
    </div>
  );
}

export function FlightRequestDetailModal({
  request, isDark, assigning, denying, onClose,
  onAcknowledge, onDeny, onOpenLinkModal, onOpenLogModal,
}: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('details');
  const { canEdit, role } = usePermissions();
  const canAct = canEdit('operation_flight_requests');
  // Denying a client request stays with OPM-level roles; a PIC can acknowledge and plan but not deny.
  const canDeny = canAct && role !== 'PIC';

  useEffect(() => { setTab('details'); }, [request?.request_id]);

  // Operation zones of the client's systems, overlaid on the waypoint map and used to warn the OPM.
  const [zoneSystems, setZoneSystems] = useState<ZoneSystem[]>([]);
  useEffect(() => {
    setZoneSystems([]);
    const clientId = request?.fk_client_id;
    if (!clientId || !request?.waypoint?.coordinates) return;
    let cancelled = false;
    fetch('/api/system/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
      .then((r) => r.json())
      .then((res) => { if (!cancelled && res?.code === 1 && Array.isArray(res.systems)) setZoneSystems(res.systems); })
      .catch(() => { /* zones are advisory; the request stays usable without them */ });
    return () => { cancelled = true; };
  }, [request?.request_id, request?.fk_client_id, request?.waypoint]);

  if (!request) return null;

  const busy = assigning === request.request_id || denying === request.request_id;
  const divider = isDark ? 'divide-slate-700/50' : 'divide-gray-100';
  const bg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const tabActive = isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm';
  const tabInactive = isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'location', label: 'Location' },
    { id: 'action', label: 'Action' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col h-[640px] max-h-[90vh] ${bg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-gray-100'}`}>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Flight Request</p>
            <h2 className={`text-base font-semibold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{request.external_mission_id}</h2>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border mt-1.5 ${STATUS_COLORS[request.dcc_status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {request.dcc_status}
            </span>
          </div>
          <button onClick={onClose} className={`cursor-pointer p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className={`flex justify-center px-4 pt-3 pb-0 gap-1 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
          <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-1.5 cursor-pointer rounded-md text-xs font-medium transition-all ${tab === id ? tabActive : tabInactive}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab !== 'location' && <ZoneWarnings systems={zoneSystems} waypoint={request.waypoint} isDark={isDark} scrollable />}

          {tab === 'details' && (
            <div className={`divide-y ${divider}`}>
              <DetailRow label="Mission ID" value={<span className="font-mono font-semibold text-violet-400">{request.external_mission_id}</span>} isDark={isDark} />
              <DetailRow label="Operator" value={request.operator} isDark={isDark} />
              <DetailRow label="Type" value={request.mission_type} isDark={isDark} />
              <DetailRow label="Target" value={request.target} isDark={isDark} />
              <DetailRow label="Priority" value={
                request.priority
                  ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[request.priority] ?? 'bg-gray-100 text-gray-600'}`}>{request.priority}</span>
                  : null
              } isDark={isDark} />
              <DetailRow label="Notes" value={request.notes} isDark={isDark} />
              <DetailRow label="Received" value={format(new Date(request.created_at), 'dd MMM yyyy HH:mm')} isDark={isDark} />
              <DetailRow label="Start Date" value={request.start_datetime ? format(new Date(request.start_datetime), 'dd MMM yyyy HH:mm') : null} isDark={isDark} />
              <DetailRow label={t('planning.flightRequests.zone.label')} value={
                <div className="space-y-1">
                  <ZoneBadge r={request} t={t} />
                  {request.zone_validated === true && request.zone_check?.distanceM != null && (
                    <div className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      {t('planning.flightRequests.zone.nearestSystem', { system: request.matched_tool_code ?? '—', km: (request.zone_check.distanceM / 1000).toFixed(1) })}
                    </div>
                  )}
                  {request.zone_validated !== true && request.zone_check?.reason && (
                    <div className={isDark ? 'text-slate-400' : 'text-gray-500'}>{request.zone_check.reason}</div>
                  )}
                </div>
              } isDark={isDark} />
              <DetailRow label={t('planning.flightRequests.columns.mission')} value={
                request.fk_pilot_mission_id
                  ? <span className="font-mono">{request.mission_code ?? `#${request.fk_pilot_mission_id}`}{request.mission_status ? ` · ${request.mission_status.replace(/_/g, ' ')}` : ''}</span>
                  : null
              } isDark={isDark} />
              {request.localization && (
                <DetailRow label="Localization" value={
                  <div className="space-y-0.5">
                    {request.localization.highway && <div><span className="font-semibold">Highway:</span> {request.localization.highway} ({request.localization.carriageway})</div>}
                    {request.localization.kmStart !== undefined && <div>km {request.localization.kmStart} – {request.localization.kmEnd}</div>}
                  </div>
                } isDark={isDark} />
              )}
            </div>
          )}

          {tab === 'location' && (
            <>
              <ZoneWarnings systems={zoneSystems} waypoint={request.waypoint} isDark={isDark} />
              <WaypointMap waypoint={request.waypoint} isDark={isDark} zoneSystems={zoneSystems} />
              {request.waypoint?.coordinates && <ZoneLegend isDark={isDark} showWaypoint />}
            </>
          )}

          {tab === 'action' && (
            <div className="space-y-3 py-2">
              {canAct && (request.dcc_status === 'NEW' || request.dcc_status === 'ACKNOWLEDGED') && (
                <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Request Decision</p>
                  <div className="flex flex-col gap-2">
                    {request.dcc_status === 'NEW' && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => onAcknowledge(request.request_id)}
                        className="w-full cursor-pointer h-9 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-2"
                      >
                        {assigning === request.request_id
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Acknowledging…</>
                          : <><CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge Request</>}
                      </Button>
                    )}
                    {request.dcc_status === 'ACKNOWLEDGED' && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => { onOpenLinkModal(request); onClose(); }}
                        className="w-full h-9 cursor-pointer text-xs bg-violet-600 hover:bg-violet-500 text-white gap-2"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {t('planning.flightRequests.link.button')}
                      </Button>
                    )}
                    {canDeny && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onDeny(request.request_id)}
                      className={`w-full cursor-pointer h-9 text-xs gap-2 border-red-500/40 text-red-500 hover:bg-red-500/10 ${isDark ? 'hover:border-red-500/60' : ''}`}
                    >
                      {denying === request.request_id
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Denying…</>
                        : <><X className="h-3.5 w-3.5" /> Deny Request</>}
                    </Button>
                    )}
                  </div>
                </div>
              )}

              {['ASSIGNED', 'IN_PROGRESS'].includes(request.dcc_status) && (
                <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${isDark ? 'border-slate-700 bg-slate-800/40 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 mt-px" />
                  <span>{t('planning.flightRequests.link.autoStatusHint', { mission: request.mission_code ?? (request.fk_pilot_mission_id ? `#${request.fk_pilot_mission_id}` : '—') })}</span>
                </div>
              )}

              {canAct && ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(request.dcc_status) && (
                <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Log</p>
                  <Button
                    size="sm"
                    onClick={() => { onOpenLogModal(request.request_id, request.external_mission_id); onClose(); }}
                    className="w-full cursor-pointer h-9 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-2"
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Push Control Center Log
                  </Button>

                </div>
              )}

              {!['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(request.dcc_status) && (
                <div className={`flex flex-col items-center justify-center py-8 gap-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  <CheckCircle2 className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No actions available for this status.</p>
                </div>
              )}

              {request.dcc_status === 'REJECTED' && (
                <div className={`rounded-xl border p-4 space-y-1.5 ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-red-400' : 'text-red-500'}`}>Reason for denial</p>
                  <p className={`text-sm whitespace-pre-wrap break-words ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {request.deny_note?.trim() || 'No reason provided.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
