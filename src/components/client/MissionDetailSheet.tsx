'use client';

import { ClientMission } from '@/components/tables/ClientMissionColumns';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Activity,
  Clock,
  FileText,
  MapPin,
  Navigation,
  User,
  Wrench,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STATUS_BADGE: Record<string, { className: string }> = {
  PLANNED:     { className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800' },
  IN_PROGRESS: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' },
  COMPLETED:   { className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' },
  CANCELLED:   { className: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600' },
  ABORTED:     { className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800' },
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

function formatDate(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface Props {
  mission: ClientMission | null;
  isDark: boolean;
  onClose: () => void;
}

export default function MissionDetailSheet({ mission, isDark, onClose }: Props) {
  const { t } = useTranslation();

  const statusKey = (mission?.status_name ?? '').toUpperCase().replace(/\s+/g, '_');
  const statusBadgeClass = STATUS_BADGE[statusKey]?.className ?? 'bg-slate-100 text-slate-500 border-slate-200';
  const isCompleted = mission?.status_name === 'COMPLETED';

  return (
    <Sheet open={!!mission} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        className={cn(
          'w-full sm:max-w-md overflow-y-auto p-6',
          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white',
        )}
        side="right"
      >
        {mission && (
          <>
            <SheetHeader className="mb-6 pb-4 border-b">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {mission.mission_code}
                </span>
                {mission.status_name && (
                  <Badge variant="outline" className={cn('text-xs', statusBadgeClass)}>
                    {mission.status_name}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-left text-base mt-1">
                {mission.mission_name ?? mission.mission_code}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6">
              {/* Timeline */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('operations.table.detail.timeline', 'Timeline')}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className={cn('rounded-lg border p-3 space-y-1', isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30')}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('clientPortal.fieldScheduledStart', 'Scheduled Start')}
                    </p>
                    <p className="text-sm font-medium">{formatDate(mission.scheduled_start)}</p>
                  </div>
                  <div className={cn('rounded-lg border p-3 space-y-1', isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30')}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-500" />
                      {t('clientPortal.fieldActualStart', 'Actual Start')}
                    </p>
                    <p className="text-sm font-medium">{formatDate(mission.actual_start)}</p>
                  </div>
                  <div className={cn('rounded-lg border p-3 space-y-1', isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30')}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-500" />
                      {t('clientPortal.fieldActualEnd', 'Actual End')}
                    </p>
                    <p className="text-sm font-medium">{formatDate(mission.actual_end)}</p>
                  </div>
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Personnel & Equipment */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('operations.table.detail.personnelEquipment', 'Personnel & Equipment')}
                </h3>
                <div className="space-y-2">
                  <DetailRow
                    icon={<User className="h-3.5 w-3.5" />}
                    label={t('clientPortal.fieldPilot', 'Pilot')}
                    value={mission.pilot_name}
                  />
                  <DetailRow
                    icon={<Wrench className="h-3.5 w-3.5" />}
                    label={t('clientPortal.fieldDrone', 'Drone System')}
                    value={mission.tool_code
                      ? `${mission.tool_code}${mission.tool_name ? ` · ${mission.tool_name}` : ''}`
                      : null}
                  />
                  {mission.location && (
                    <DetailRow
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label={t('clientPortal.fieldLocation', 'Location')}
                      value={mission.location}
                    />
                  )}
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Flight Results */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('operations.table.detail.flightResults', 'Flight Results')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn(
                    'rounded-lg border p-3 space-y-1',
                    isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30',
                  )}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {t('clientPortal.fieldDuration', 'Duration')}
                    </p>
                    <p className={cn(
                      'text-lg font-bold tabular-nums',
                      isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
                    )}>
                      {formatDuration(mission.flight_duration)}
                    </p>
                  </div>
                  <div className={cn(
                    'rounded-lg border p-3 space-y-1',
                    isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30',
                  )}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      {t('clientPortal.fieldDistance', 'Distance')}
                    </p>
                    <p className={cn(
                      'text-lg font-bold tabular-nums',
                      isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
                    )}>
                      {mission.distance_flown != null
                        ? `${(mission.distance_flown / 1000).toFixed(2)} km`
                        : '—'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Notes */}
              {mission.notes && (
                <>
                  <div className="h-px bg-border" />
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      {t('clientPortal.fieldNotes', 'Notes')}
                    </h3>
                    <div className={cn(
                      'rounded-lg border p-3',
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30',
                    )}>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{mission.notes}</p>
                    </div>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
