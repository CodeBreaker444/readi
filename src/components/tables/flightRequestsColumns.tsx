import { FeatureGate } from '@/components/permissions/FeatureGate';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ExternalLink, Link2, Loader2, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';

export interface FlightRequest {
  request_id: number;
  external_mission_id: string;
  client_name?: string | null;
  fk_client_id?: number | null;
  deny_note?: string | null;
  mission_type: string | null;
  target: string | null;
  localization: any;
  waypoint: any;
  start_datetime: string | null;
  priority: string | null;
  notes: string | null;
  operator: string | null;
  dcc_status: string;
  fk_planning_id: number | null;
  assigned_at: string | null;
  created_at: string;
  /** true = inside a client system's zones, false = outside (auto-rejected), null = not checked. */
  zone_validated?: boolean | null;
  matched_tool_id?: number | null;
  matched_tool_code?: string | null;
  zone_check?: {
    reason?: string | null;
    distanceM?: number | null;
    nearestToolCode?: string | null;
    matchedToolCode?: string | null;
  } | null;
  /** Scheduled mission the request is linked to. */
  fk_pilot_mission_id?: number | null;
  mission_code?: string | null;
  mission_status?: string | null;
}

export interface Evaluation {
  evaluation_id: number;
  evaluation_year: string | number | null;
  client_name: string;
  evaluation_desc: string;
  evaluation_status: string;
}

export interface FlightRequestColumnHandlers {
  deleting: number | null;
  isDark: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onView: (request: FlightRequest) => void;
  onDelete: (request_id: number) => void;
}

/** Zone check result of a client request: green = inside a system's zones, red = outside. */
export function ZoneBadge({ r, t }: { r: FlightRequest; t: FlightRequestColumnHandlers['t'] }) {
  if (r.zone_validated === true) {
    return (
      <span title={t('planning.flightRequests.zone.validatedTitle')} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border bg-green-500/10 text-green-600 border-green-500/30">
        <ShieldCheck className="h-3 w-3" />
        {r.matched_tool_code ?? t('planning.flightRequests.zone.validated')}
      </span>
    );
  }
  if (r.zone_validated === false) {
    return (
      <span title={r.zone_check?.reason ?? ''} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border bg-red-500/10 text-red-500 border-red-500/30">
        <ShieldAlert className="h-3 w-3" />
        {t('planning.flightRequests.zone.outside')}
      </span>
    );
  }
  return <span title={r.zone_check?.reason ?? ''} className="text-[11px] text-slate-400">{t('planning.flightRequests.zone.notChecked')}</span>;
}

const STATUS_COLORS: Record<string, string> = {
  NEW:          'bg-blue-500/10 text-blue-500 border-blue-500/30',
  ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  ASSIGNED:     'bg-violet-500/10 text-violet-500 border-violet-500/30',
  REJECTED:     'bg-red-500/10 text-red-500 border-red-500/30',
  IN_PROGRESS:  'bg-orange-500/10 text-orange-500 border-orange-500/30',
  COMPLETED:    'bg-green-500/10 text-green-600 border-green-500/30',
  ISSUE:        'bg-red-500/10 text-red-400 border-red-400/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW:    'bg-green-100 text-green-700',
};

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {t(`planning.flightRequests.statuses.${status}`)}
    </span>
  );
}

function LocalizationCell({ loc }: { loc: any }) {
  if (!loc) return <span className="text-slate-400">—</span>;
  return (
    <div className="text-[11px] space-y-0.5">
      {loc.highway && <div><span className="font-semibold">Highway:</span> {loc.highway} ({loc.carriageway})</div>}
      {loc.kmStart !== undefined && <div><span className="font-semibold">km:</span> {loc.kmStart} – {loc.kmEnd}</div>}
      {loc.type && <div className="text-slate-400">{loc.type}</div>}
    </div>
  );
}

function WaypointCell({ wp }: { wp: any }) {
  if (!wp?.coordinates) return <span className="text-slate-400">—</span>;
  const [lng, lat, alt] = wp.coordinates;
  return (
    <div className="text-[11px] font-mono space-y-0.5">
      <div>{lat.toFixed(6)}, {lng.toFixed(6)}</div>
      {alt !== undefined && <div className="text-slate-400">alt: {alt}m</div>}
    </div>
  );
}

export function createFlightRequestColumns(handlers: FlightRequestColumnHandlers): ColumnDef<FlightRequest>[] {
  const { deleting, isDark, t, onView, onDelete } = handlers;

  return [
    {
      id: 'external_mission_id',
      header: t('planning.flightRequests.columns.missionId'),
      accessorKey: 'external_mission_id',
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-violet-400">{getValue<string>()}</span>
      ),
    },
    {
      id: 'client_name',
      header: t('planning.flightRequests.columns.client'),
      accessorKey: 'client_name',
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },
    {
      id: 'mission_type',
      header: t('planning.flightRequests.columns.type'),
      accessorKey: 'mission_type',
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },
    {
      id: 'target',
      header: t('planning.flightRequests.columns.target'),
      accessorKey: 'target',
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },
    {
      id: 'operator',
      header: t('planning.flightRequests.columns.operator'),
      accessorKey: 'operator',
      cell: ({ getValue }) => (
        <span className="font-mono">{getValue<string>() ?? '—'}</span>
      ),
    },
    {
      id: 'localization',
      header: t('planning.flightRequests.columns.localization'),
      accessorKey: 'localization',
      cell: ({ getValue }) => <LocalizationCell loc={getValue()} />,
    },
    {
      id: 'waypoint',
      header: t('planning.flightRequests.columns.waypoint'),
      accessorKey: 'waypoint',
      cell: ({ getValue }) => <WaypointCell wp={getValue()} />,
    },
    {
      id: 'priority',
      header: t('planning.flightRequests.columns.priority'),
      accessorKey: 'priority',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        if (!v) return '—';
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[v] ?? 'bg-gray-100 text-gray-600'}`}>
            {v}
          </span>
        );
      },
    },
    {
      id: 'zone',
      header: t('planning.flightRequests.columns.zone'),
      cell: ({ row }) => <ZoneBadge r={row.original} t={t} />,
    },
    {
      id: 'mission',
      header: t('planning.flightRequests.columns.mission'),
      cell: ({ row }) => {
        const r = row.original;
        if (!r.fk_pilot_mission_id) return <span className="text-slate-400">—</span>;
        return (
          <div className="text-[11px] space-y-0.5">
            <div className="inline-flex items-center gap-1 font-mono font-semibold">
              <Link2 className="h-3 w-3 text-violet-400" />
              {r.mission_code ?? `#${r.fk_pilot_mission_id}`}
            </div>
            {r.mission_status && <div className="text-slate-400">{r.mission_status.replace(/_/g, ' ')}</div>}
          </div>
        );
      },
    },
    {
      id: 'dcc_status',
      header: t('planning.flightRequests.columns.status'),
      accessorKey: 'dcc_status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} t={t} />,
    },
    {
      id: 'created_at',
      header: t('planning.flightRequests.columns.received'),
      accessorKey: 'created_at',
      cell: ({ getValue }) => (
        <span className="text-[11px]">{format(new Date(getValue<string>()), 'dd MMM HH:mm')}</span>
      ),
    },
    {
      id: 'actions',
      header: t('planning.flightRequests.columns.actions'),
      cell: ({ row }) => {
        const r = row.original;
        const isDeleting = deleting === r.request_id;
        // No manual status buttons: the status follows the linked mission on the Daily Board.

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View button — opens detail modal */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(r)}
              className={`h-7 text-xs gap-1 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
            >
              <ExternalLink className="h-3 w-3" />
              {t('planning.flightRequests.actions.view')}
            </Button>

            {/* Delete */}
            <FeatureGate feature="operation_flight_requests" require="delete">
              <Button
                size="sm"
                variant="outline"
                disabled={isDeleting}
                onClick={() => onDelete(r.request_id)}
                className={`h-7 w-7 p-0 border-red-500/30 text-red-500 hover:bg-red-500/10 ${isDark ? 'hover:border-red-500/50' : ''}`}
              >
                {isDeleting
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Trash2 className="h-3 w-3" />}
              </Button>
            </FeatureGate>
          </div>
        );
      },
    },
  ];
}
