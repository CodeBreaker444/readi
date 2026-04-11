import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CheckCircle2, FileUp, Loader2, Send, Trash2, X } from 'lucide-react';

export interface FlightRequest {
  request_id: number;
  external_mission_id: string;
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
}

export interface Evaluation {
  evaluation_id: number;
  evaluation_year: string | number | null;
  client_name: string;
  evaluation_desc: string;
  evaluation_status: string;
}

export interface FlightRequestColumnHandlers {
  assigning: number | null;
  denying: number | null;
  deleting: number | null;
  isDark: boolean;
  onAcknowledge: (request_id: number) => void;
  onDeny: (request_id: number) => void;
  onDelete: (request_id: number) => void;
  onOpenPlanModal: (request_id: number, mission_id: string) => void;
  onOpenLogModal: (request_id: number, mission_id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  NEW:          'bg-blue-500/10 text-blue-500 border-blue-500/30',
  ACKNOWLEDGED: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  ASSIGNED:     'bg-violet-500/10 text-violet-500 border-violet-500/30',
  REJECTED:     'bg-red-500/10 text-red-500 border-red-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW:    'bg-green-100 text-green-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
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
  const { assigning, denying, deleting, isDark, onAcknowledge, onDeny, onDelete, onOpenPlanModal, onOpenLogModal } = handlers;
  const btnBase = `h-7 text-xs gap-1 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`;

  return [
    {
      id: 'external_mission_id',
      header: 'Mission ID',
      accessorKey: 'external_mission_id',
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-violet-400">{getValue<string>()}</span>
      ),
    },
    {
      id: 'mission_type',
      header: 'Type',
      accessorKey: 'mission_type',
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },
    {
      id: 'target',
      header: 'Target',
      accessorKey: 'target',
      cell: ({ getValue }) => getValue<string>() ?? '—',
    },
    {
      id: 'localization',
      header: 'Localization',
      accessorKey: 'localization',
      cell: ({ getValue }) => <LocalizationCell loc={getValue()} />,
    },
    {
      id: 'waypoint',
      header: 'Waypoint',
      accessorKey: 'waypoint',
      cell: ({ getValue }) => <WaypointCell wp={getValue()} />,
    },
    {
      id: 'start_datetime',
      header: 'Start Date',
      accessorKey: 'start_datetime',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? format(new Date(v), 'dd MMM yyyy HH:mm') : '—';
      },
    },
    {
      id: 'priority',
      header: 'Priority',
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
      id: 'operator',
      header: 'Operator',
      accessorKey: 'operator',
      cell: ({ getValue }) => (
        <span className="font-mono">{getValue<string>() ?? '—'}</span>
      ),
    },
    {
      id: 'dcc_status',
      header: 'Status',
      accessorKey: 'dcc_status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      id: 'created_at',
      header: 'Received',
      accessorKey: 'created_at',
      cell: ({ getValue }) => (
        <span className="text-[11px]">{format(new Date(getValue<string>()), 'dd MMM HH:mm')}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const r = row.original;
        const busy = assigning === r.request_id || denying === r.request_id;
        return (
          <div className="flex items-center gap-1.5">
            {r.dcc_status === 'NEW' && (
              <Button size="sm" variant="outline" disabled={busy} className={btnBase}
                onClick={() => onAcknowledge(r.request_id)}>
                {assigning === r.request_id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <CheckCircle2 className="h-3 w-3" />}
                Acknowledge
              </Button>
            )}
            {r.dcc_status === 'ACKNOWLEDGED' && (
              <Button size="sm" variant="outline" disabled={denying === r.request_id} className={btnBase}
                onClick={() => onOpenPlanModal(r.request_id, r.external_mission_id)}>
                <Send className="h-3 w-3" />
                Move to Planning
              </Button>
            )}
            {(r.dcc_status === 'NEW' || r.dcc_status === 'ACKNOWLEDGED') && (
              <Button size="sm" variant="outline" disabled={busy} className={`h-7 text-xs gap-1 border-red-500/40 text-red-500 hover:bg-red-500/10 ${isDark ? 'hover:border-red-500/60' : ''}`}
                onClick={() => onDeny(r.request_id)}>
                {denying === r.request_id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <X className="h-3 w-3" />}
                Deny
              </Button>
            )}
            {r.dcc_status === 'ASSIGNED' && (
              <Button size="sm" variant="outline" className={btnBase}
                onClick={() => onOpenLogModal(r.request_id, r.external_mission_id)}>
                <FileUp className="h-3 w-3" />
                Push Log
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={deleting === r.request_id}
              onClick={() => onDelete(r.request_id)}
              className={`h-7 w-7 p-0 border-red-500/30 text-red-500 hover:bg-red-500/10 ${isDark ? 'hover:border-red-500/50' : ''}`}
            >
              {deleting === r.request_id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        );
      },
    },
  ];
}
