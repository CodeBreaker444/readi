'use client';

import { Button } from '@/components/ui/button';
import { Archive, CheckCircle2, FileUp, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LogStatus {
  has_log: boolean;
  logs: Array<{
    log_id: number;
    original_filename: string;
    flytbase_flight_id: string | null;
    uploaded_at: string;
  }>;
  reason?: string;
}

interface AvailableFlight {
  flight_id: string;
  flight_name?: string;
  start_time?: number;
  drone_name?: string;
}

interface FlightRequestsLogModalProps {
  isDark: boolean;
  logModal: { request_id: number; mission_id: string } | null;
  logStatus: LogStatus | null;
  logStatusLoading: boolean;
  flightsLoading: boolean;
  availableFlights: AvailableFlight[];
  selectedFlightId: string;
  archiving: boolean;
  pushingLog: boolean;
  onSelectFlight: (flightId: string) => void;
  onArchive: () => void;
  onPush: () => void;
  onClose: () => void;
}

export function FlightRequestsLogModal({
  isDark,
  logModal,
  logStatus,
  logStatusLoading,
  flightsLoading,
  availableFlights,
  selectedFlightId,
  archiving,
  pushingLog,
  onSelectFlight,
  onArchive,
  onPush,
  onClose,
}: FlightRequestsLogModalProps) {
  const { t } = useTranslation();

  if (!logModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl border shadow-xl p-6 space-y-5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('planning.flightRequests.pushLogDcc')}</h2>
            <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{logModal.mission_id}</p>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={`rounded-xl border p-4 space-y-1 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('planning.flightRequests.step1')}</p>
          {logStatusLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('planning.flightRequests.checking')}
            </div>
          ) : !logStatus ? null : logStatus.reason === 'not_assigned' ? (
            <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{t('planning.flightRequests.notAssigned')}</p>
          ) : logStatus.reason === 'no_mission' ? (
            <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{t('planning.flightRequests.noMission')}</p>
          ) : logStatus.logs.length > 0 ? (
            <div className="space-y-1.5">
              {logStatus.logs.map((log) => {
                const isFlytbase = !!log.flytbase_flight_id;
                return (
                  <div
                    key={log.log_id}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                      isFlytbase
                        ? isDark ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
                        : isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-100 border-gray-200'
                    }`}
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isFlytbase ? isDark ? 'text-emerald-400' : 'text-emerald-600' : isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                    <span className={`text-xs font-mono flex-1 truncate ${isFlytbase ? isDark ? 'text-emerald-300' : 'text-emerald-700' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {log.original_filename}
                    </span>
                    <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full ${
                      isFlytbase
                        ? isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                        : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isFlytbase ? t('planning.flightRequests.flightSource') : t('planning.flightRequests.manual')}
                    </span>
                  </div>
                );
              })}
              {!logStatus.has_log && (
                <p className={`text-xs pt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{t('planning.flightRequests.manualLog')}</p>
              )}
            </div>
          ) : (
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('planning.flightRequests.noLogArchived')}</p>
          )}
        </div>

        {logStatus && !logStatus.has_log && !['not_assigned', 'no_mission'].includes(logStatus.reason ?? '') && (
          <div className="space-y-2">
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('planning.flightRequests.selectFlightArchive')}</p>
            {flightsLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('planning.flightRequests.loadingFlights')}
              </div>
            ) : availableFlights.length === 0 ? (
              <p className={`text-xs py-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('planning.flightRequests.noFlights')}</p>
            ) : (
              <div className={`rounded-xl border overflow-hidden divide-y max-h-48 overflow-y-auto ${isDark ? 'border-slate-700 divide-slate-700/60' : 'border-gray-200 divide-gray-100'}`}>
                {availableFlights.map((flight) => {
                  const isSelected = selectedFlightId === flight.flight_id;
                  return (
                    <button
                      key={flight.flight_id}
                      onClick={() => onSelectFlight(flight.flight_id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-xs transition-colors ${
                        isSelected
                          ? isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-50 text-violet-700'
                          : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-violet-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="font-mono font-medium">{flight.flight_name ?? flight.flight_id}</span>
                        {flight.drone_name && <span className={`ml-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{flight.drone_name}</span>}
                      </span>
                      {flight.start_time && (
                        <span className={`shrink-0 text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {new Date(flight.start_time).toLocaleDateString()}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <Button
              size="sm"
              onClick={onArchive}
              disabled={!selectedFlightId || archiving}
              className="w-full h-8 text-xs bg-slate-700 hover:bg-slate-600 text-white"
            >
              {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Archive className="h-3.5 w-3.5 mr-1.5" />}
              {archiving ? t('planning.flightRequests.archiving') : t('planning.flightRequests.archiveSelected')}
            </Button>
          </div>
        )}

        <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-semibold mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('planning.flightRequests.step2')}</p>
          {!logStatus?.has_log ? (
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('planning.flightRequests.archiveFirst')}</p>
          ) : (
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('planning.flightRequests.dccDesc')}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onPush}
              disabled={!logStatus?.has_log || pushingLog}
              className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
            >
              {pushingLog ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <FileUp className="h-3.5 w-3.5 mr-1.5" />}
              {pushingLog ? t('planning.flightRequests.pushing') : t('planning.flightRequests.pushDcc')}
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} className={`h-8 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
