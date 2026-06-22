'use client';

import { AuditLog, EVENT_TYPE_COLORS } from '@/components/tables/AuditLogsTable';
import { useTimezone } from '@/components/TimezoneProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { formatDateInTz, formatTimeInTz } from '@/lib/utils';

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

function Field({ label, value, mono, className }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) {
  const { isDark } = useTheme();
  return (
    <div className={className}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
      <div className={`text-[12px] break-all ${mono ? 'font-mono' : ''} ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
        {value ?? <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

export function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  const { isDark } = useTheme();
  const { timezone } = useTimezone();

  if (!log) return null;

  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
  const isDcc = log.entity_type === 'dcc_bug_report';
  const dcc = isDcc ? (log.metadata as any)?.dcc : null;

  return (
    <Dialog open={!!log} onOpenChange={onClose}>
      <DialogContent className={`max-w-250! w-[95vw] max-h-[88vh] overflow-y-auto ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white'}`}>
        <DialogHeader>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-tight ${EVENT_TYPE_COLORS[log.event_type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {log.event_type}
            </span>
            <DialogTitle className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {log.entity_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Event
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Description */}
          <div className={`rounded-lg border p-3.5 ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Description
            </p>
            <p className={`text-[13px] leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {log.description ?? '—'}
            </p>
          </div>

          {/* Core details grid */}
          <div className={`rounded-lg border p-3.5 grid grid-cols-2 gap-x-6 gap-y-4 ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-slate-50 border-slate-100'}`}>
            <Field label="Section" value={log.entity_type.replace(/_/g, ' ')} />
            <Field label="Entity ID" value={log.entity_id} mono />
            <Field
              label="Timestamp"
              value={
                <span>
                  {formatDateInTz(log.created_at, timezone)}{' '}
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{formatTimeInTz(log.created_at, timezone)}</span>
                </span>
              }
            />
            <Field label="IP Address" value={log.ip_address} mono />
          </div>

          {/* User info */}
          <div className={`rounded-lg border p-3.5 grid grid-cols-2 gap-x-6 gap-y-4 ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-slate-50 border-slate-100'}`}>
            <Field label="User" value={log.user_name ?? 'System'} />
            <Field label="Role" value={log.user_role} />
            <Field label="Email" value={log.user_email} mono className="col-span-2" />
          </div>

          {/* DCC details */}
          {isDcc && dcc && (
            <div className={`rounded-lg border p-3.5 space-y-3 ${isDark ? 'bg-amber-950/20 border-amber-800/30' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                DCC Details
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {dcc.path && <Field label="Endpoint" value={dcc.path} mono />}
                {dcc.outcome && <Field label="Outcome" value={dcc.outcome} />}
                {dcc.message && <Field label="Message" value={dcc.message} />}
                {dcc.httpStatus != null && <Field label="HTTP Status" value={String(dcc.httpStatus)} mono />}
              </div>
              {dcc.responseBody?.trim() && (
                <div>
                  <p className={`text-[10px] font-medium mb-1 ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>Response Body</p>
                  <pre className={`text-[10px] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40 ${isDark ? 'bg-black/30 text-amber-200' : 'bg-white text-amber-900'}`}>
                    {dcc.responseBody.trim()}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Generic metadata */}
          {hasMeta && !isDcc && (
            <div className={`rounded-lg border p-3.5 ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Metadata
              </p>
              <pre className={`text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-48 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
