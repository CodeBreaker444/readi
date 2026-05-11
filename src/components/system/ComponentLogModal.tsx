'use client';

import { ExportButton } from '@/components/ExportButton';
import { useTimezone } from '@/components/TimezoneProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeInTz } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

interface AuditLog {
  id: number;
  event_type: string;
  description: string | null;
  user_name: string | null;
  created_at: string;
}

interface TicketEvent {
  event_id: number;
  event_type: string;
  event_description: string | null;
  created_at: string;
}

interface TicketWithEvents {
  ticket_id: number;
  ticket_status: string;
  reported_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  maintenance_ticket_event: TicketEvent[];
}

interface MissionEntry {
  pilot_mission_id: number;
  mission_code: string | null;
  actual_start: string | null;
  actual_end: string | null;
  flight_duration: number | null;
  distance_flown: number | null;
}

interface LogEntry {
  id: string;
  time: string;
  type: string;
  label: string;
  description: string;
  source: 'audit' | 'ticket' | 'mission';
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}


const EVENT_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  CREATED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  ASSIGNED: 'bg-violet-100 text-violet-700 border-violet-200',
  REPORT_ADDED: 'bg-amber-100 text-amber-700 border-amber-200',
  ATTACHMENT_ADDED: 'bg-sky-100 text-sky-700 border-sky-200',
  ATTACHMENT_DELETED: 'bg-red-100 text-red-700 border-red-200',
  MISSION: 'bg-violet-100 text-violet-700 border-violet-200',
};

export function ComponentLogModal({
  open,
  onClose,
  componentId,
  componentLabel,
}: {
  open: boolean;
  onClose: () => void;
  componentId: number | null;
  componentLabel: string;
}) {
  const { timezone } = useTimezone();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const exportData = useMemo(
    () =>
      entries.map((e) => ({
        timestamp: formatDateTimeInTz(e.time, timezone),
        type: e.type,
        source: e.source === 'ticket' ? 'Maintenance' : e.source === 'mission' ? 'Mission' : 'System',
        description: e.description,
      })),
    [entries, timezone]
  );

  const EXPORT_COLUMNS = [
    { header: 'Timestamp', key: 'timestamp' },
    { header: 'Type', key: 'type' },
    { header: 'Source', key: 'source' },
    { header: 'Description', key: 'description' },
  ];

  useEffect(() => {
    if (!open || !componentId) return;
    setLoading(true);
    fetch(`/api/system/component/${componentId}/logs`)
      .then(r => r.json())
      .then(data => {
        if (data.code !== 1) return;
        const logs: LogEntry[] = [];

        for (const al of (data.audit_logs ?? []) as AuditLog[]) {
          logs.push({
            id: `audit-${al.id}`,
            time: al.created_at,
            type: al.event_type,
            label: al.event_type,
            description: al.description ?? '',
            source: 'audit',
          });
        }

        for (const ticket of (data.ticket_events ?? []) as TicketWithEvents[]) {
          for (const ev of ticket.maintenance_ticket_event) {
            logs.push({
              id: `ticket-${ev.event_id}`,
              time: ev.created_at,
              type: ev.event_type,
              label: ev.event_type,
              description: `[Ticket #${ticket.ticket_id}] ${ev.event_description ?? ''}`,
              source: 'ticket',
            });
          }
        }

        for (const m of (data.missions ?? []) as MissionEntry[]) {
          if (!m.actual_start) continue;
          const parts: string[] = [m.mission_code ?? `Mission #${m.pilot_mission_id}`];
          if (m.flight_duration != null) parts.push(formatDuration(m.flight_duration));
          if (m.distance_flown != null) parts.push(formatDistance(m.distance_flown));
          logs.push({
            id: `mission-${m.pilot_mission_id}`,
            time: m.actual_start,
            type: 'MISSION',
            label: 'MISSION',
            description: parts.join(' · '),
            source: 'mission',
          });
        }

        logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setEntries(logs);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [open, componentId]);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="!max-w-[640px] w-[95vw] h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between gap-3 mr-6">
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Component Log
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">{componentLabel}</p>
            </div>
            <ExportButton
              data={exportData}
              columns={EXPORT_COLUMNS}
              filename={`component-log-${componentId ?? 'unknown'}`}
              title={`Component Log — ${componentLabel}`}
              disabled={loading || entries.length === 0}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="w-16 h-5 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-full rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No log entries found for this component.</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {entries.map(entry => (
                <li key={entry.id} className="ml-5">
                  <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white bg-slate-400" />
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${EVENT_COLORS[entry.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {entry.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {entry.source === 'ticket' ? 'Maintenance' : entry.source === 'mission' ? 'Mission' : 'System'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{entry.description}</p>
                  <time className="text-xs text-slate-400">{formatDateTimeInTz(entry.time, timezone)}</time>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
