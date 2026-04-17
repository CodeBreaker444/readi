'use client';

import { Operation } from '@/app/operations/table/page';
import { MaintenanceCycleModal } from '@/components/operation/MaintenanceCycleModal';
import { ReportIssueModal } from '@/components/operation/ReportIssueModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  Ban,
  Briefcase,
  Clock,
  FileText,
  MapPin,
  Navigation,
  User,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_BADGE: Record<string, { className: string }> = {
  PLANNED: { className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS: { className: 'bg-violet-50 text-violet-700 border-violet-200' },
  COMPLETED: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { className: 'bg-slate-100 text-slate-500 border-slate-200' },
  ABORTED: { className: 'bg-red-50 text-red-700 border-red-200' },
};

function formatDateTime(val?: string | null) {
  if (!val) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(val));
  } catch {
    return val;
  }
}

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

interface OperationDetailSheetProps {
  isDark: boolean;
  operation: Operation | null;
  onClose: () => void;
}

export function OperationDetailSheet({
  isDark,
  operation,
  onClose,
}: OperationDetailSheetProps) {
  const { t } = useTranslation();
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);

  const isCompleted = operation?.status_name === 'COMPLETED';

  const statusLabel = operation?.status_name
    ? t(`operations.table.status.${
        operation.status_name === 'IN_PROGRESS'
          ? 'inProgress'
          : operation.status_name.charAt(0) + operation.status_name.slice(1).toLowerCase()
      }`)
    : '';

  return (
    <>
      <Sheet open={!!operation} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          className={`w-full sm:max-w-md overflow-y-auto p-6 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white'
          }`}
          side="right"
        >
          {operation && (
            <>
              <SheetHeader className="mb-6 pb-4 border-b">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {operation.mission_code}
                  </span>
                  {operation.status_name && STATUS_BADGE[operation.status_name] && (
                    <Badge
                      variant="outline"
                      className={cn('text-xs', STATUS_BADGE[operation.status_name].className)}
                    >
                      {statusLabel}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-left text-base mt-1">
                  {operation.mission_name}
                </SheetTitle>
                {operation.mission_description && (
                  <p className="text-sm text-muted-foreground text-left">
                    {operation.mission_description}
                  </p>
                )}
              </SheetHeader>

              <div className="space-y-6">
                {/* Timeline */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('operations.table.detail.timeline')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`rounded-lg border p-3 space-y-1 ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30'
                      }`}
                    >
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t('operations.table.detail.scheduled')}
                      </p>
                      <p className="text-sm font-medium">
                        {formatDateTime(operation.scheduled_start)}
                      </p>
                    </div>
                    {operation.actual_end && (
                      <div
                        className={`rounded-lg border p-3 space-y-1 ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30'
                        }`}
                      >
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('operations.table.detail.endTime')}
                        </p>
                        <p className="text-sm font-medium">
                          {formatDateTime(operation.actual_end)}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <div className="h-px bg-border" />

                {/* Personnel & Equipment */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('operations.table.detail.personnelEquipment')}
                  </h3>
                  <div className="space-y-2">
                    <DetailRow
                      icon={<User className="h-3.5 w-3.5" />}
                      label={t('operations.table.detail.pilotInCommand')}
                      value={operation.pilot_name}
                    />
                    <DetailRow
                      icon={<Wrench className="h-3.5 w-3.5" />}
                      label={t('operations.table.detail.droneSystem')}
                      value={operation.tool_code}
                    />
                    <DetailRow
                      icon={<Briefcase className="h-3.5 w-3.5" />}
                      label={t('operations.table.detail.missionId')}
                      value={`#${operation.pilot_mission_id}`}
                    />
                    {operation.location && (
                      <DetailRow
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label={t('operations.table.detail.location')}
                        value={operation.location}
                      />
                    )}
                  </div>
                </section>

                {/* Flight Results */}
                {isCompleted && (
                  <>
                    <div className="h-px bg-border" />
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('operations.table.detail.flightResults')}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('operations.table.detail.duration')}
                          </p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {operation.flight_duration != null
                              ? `${operation.flight_duration} min`
                              : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {t('operations.table.detail.distance')}
                          </p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {operation.distance_flown != null
                              ? `${operation.distance_flown.toLocaleString()} m`
                              : '—'}
                          </p>
                        </div>
                        {operation.max_altitude != null && (
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {t('operations.table.detail.maxAltitude')}
                            </p>
                            <p className="text-sm font-bold tabular-nums">
                              {operation.max_altitude} m
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {/* Pilot Notes */}
                {operation.notes && (
                  <>
                    <div className="h-px bg-border" />
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {t('operations.table.detail.pilotNotes')}
                      </h3>
                      <div
                        className={`rounded-lg border p-3 ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-muted/30'
                        }`}
                      >
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {operation.notes}
                        </p>
                      </div>
                    </section>
                  </>
                )}

                {/* Maintenance */}
                {operation.fk_tool_id && (
                  <>
                    <div className="h-px bg-border" />
                    <section className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" />
                        {t('operations.table.detail.maintenance')}
                      </h3>
                      {isCompleted && (
                        <>
                          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-3">
                            <Ban className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                {t('operations.table.detail.updateMaintenanceCycles')}
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                {t('operations.table.detail.logFlightsHours', {
                                  code: operation.tool_code,
                                })}
                              </p>
                            </div>
                          </div>
                          <Button
                            className="w-full gap-2 bg-violet-600 hover:bg-violet-500 text-white"
                            onClick={() => setMaintenanceOpen(true)}
                          >
                            <Wrench className="h-4 w-4" />
                            {t('operations.table.detail.updateMaintenance')}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                        onClick={() => setReportIssueOpen(true)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        {t('operations.table.detail.reportIssue')}
                      </Button>
                    </section>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {operation?.fk_tool_id && (
        <MaintenanceCycleModal
          open={maintenanceOpen}
          onClose={() => setMaintenanceOpen(false)}
          toolId={operation.fk_tool_id}
          missionId={operation.pilot_mission_id}
          isDark={isDark}
        />
      )}

      {operation?.fk_tool_id && (
        <ReportIssueModal
          open={reportIssueOpen}
          onClose={() => setReportIssueOpen(false)}
          toolId={operation.fk_tool_id}
          toolCode={operation.tool_code ?? ''}
          missionId={operation.pilot_mission_id}
          isDark={isDark}
        />
      )}
    </>
  );
}
