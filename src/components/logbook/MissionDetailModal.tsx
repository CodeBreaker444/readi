'use client';

import { SystemCell } from '@/components/tables/SystemCell';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { OperationLogbookItem } from '@/config/types/logbook';

interface MissionDetailModalProps {
  mission: OperationLogbookItem | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
  PLANNED: 'bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400',
  SCHEDULED: 'bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400',
  CANCELLED: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400',
  ABORTED: 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400',
};

function formatMinutes(mins: number): string {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatKm(meters: number): string {
  if (!meters) return '—';
  return (meters / 1000).toFixed(1) + ' km';
}

function Field({ label, value, mono, className }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) {
  const { isDark } = useTheme();
  return (
    <div className={className}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
      <div className={`text-[12px] break-words ${mono ? 'font-mono' : ''} ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

export function MissionDetailModal({ mission, onClose }: MissionDetailModalProps) {
  const { isDark } = useTheme();

  if (!mission) return null;

  const statusColor =
    statusColors[(mission.mission_status_desc || '').toUpperCase()] ??
    'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-white dark:border-slate-600';
  const displayId = mission.mission_code || String(mission.mission_id).padStart(4, '0');
  const sectionClass = `rounded-lg border p-3.5 ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-slate-50 border-slate-100'}`;

  return (
    <Dialog open={!!mission} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl! w-[95vw] max-h-[88vh] overflow-y-auto ${isDark ? 'bg-[#0f1320] border-white/8' : 'bg-white'}`}>
        <DialogHeader>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tracking-tight border-violet-500/30 bg-violet-500/15 text-violet-600 dark:text-violet-400">
              {displayId}
            </span>
            <DialogTitle className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {mission.mission_name || 'Mission Details'}
            </DialogTitle>
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-tight ${statusColor}`}>
              {mission.mission_status_desc || '—'}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {mission.mission_description && (
            <div className={sectionClass}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Description
              </p>
              <p className={`text-[13px] leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {mission.mission_description}
              </p>
            </div>
          )}

          <div className={`${sectionClass} grid grid-cols-2 gap-x-6 gap-y-4`}>
            <Field label="Start" value={`${mission.date_start || '—'} ${mission.time_start || ''}`.trim()} />
            <Field label="End" value={`${mission.date_end || '—'} ${mission.time_end || ''}`.trim()} />
            <Field label="Flown Time" value={formatMinutes(mission.flown_time)} mono />
            <Field label="Distance" value={formatKm(mission.flown_meter)} mono />
            <Field label="Location" value={mission.location} className="col-span-2" />
          </div>

          <div className={`${sectionClass} grid grid-cols-2 gap-x-6 gap-y-4`}>
            <Field label="Pilot in Command" value={mission.pic_fullname} />
            <Field label="Client" value={mission.client_name} />
            <Field label="Mission Type" value={mission.mission_type_desc} />
            <Field label="Mission Category" value={mission.mission_category_desc} />
            <Field
              label="Drone System"
              value={mission.vehicle_code ? <SystemCell code={mission.vehicle_code} name={mission.vehicle_desc} size="sm" /> : null}
            />
            <Field
              label="Mission Plan"
              value={
                mission.mission_planning_code ? (
                  <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">
                    {mission.mission_planning_code}
                    {mission.mission_planning_desc ? ` — ${mission.mission_planning_desc}` : ''}
                  </span>
                ) : null
              }
            />
          </div>

          <div className={sectionClass}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Status
            </p>
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
              {mission.mission_status_desc || '—'}
            </span>
          </div>

          {mission.mission_notes && (
            <div className={sectionClass}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Notes
              </p>
              <p className={`text-[13px] leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {mission.mission_notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
