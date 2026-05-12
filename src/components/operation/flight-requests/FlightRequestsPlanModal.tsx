'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Planning {
  planning_id: number;
  planning_code: string;
  planning_desc: string;
  client_name: string;
  planning_status: string;
  has_valid_drone: boolean;
}

interface FlightRequestsPlanModalProps {
  isDark: boolean;
  planModal: { request_id: number; mission_id: string } | null;
  plannings: Planning[];
  evalLoading: boolean;
  selectedEvalId: string;
  submitting: boolean;
  onSelectPlanning: (planningId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function FlightRequestsPlanModal({
  isDark,
  planModal,
  plannings,
  evalLoading,
  selectedEvalId,
  submitting,
  onSelectPlanning,
  onConfirm,
  onClose,
}: FlightRequestsPlanModalProps) {
  const { t } = useTranslation();

  if (!planModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border shadow-xl p-6 space-y-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('planning.flightRequests.movePlanning')}</h2>
            <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{planModal.mission_id}</p>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('planning.flightRequests.selectPlanning')}</p>
          {evalLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
          ) : plannings.length === 0 ? (
            <p className={`text-xs py-3 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('planning.flightRequests.noPlannings')}</p>
          ) : (
            <div className={`rounded-lg border overflow-hidden divide-y max-h-56 overflow-y-auto ${isDark ? 'border-slate-700 divide-slate-700' : 'border-gray-200 divide-gray-100'}`}>
              {plannings.map((planning) => {
                const isSelected = selectedEvalId === String(planning.planning_id);
                const disabled = !planning.has_valid_drone;

                return (
                  <button
                    key={planning.planning_id}
                    disabled={disabled}
                    onClick={() => !disabled && onSelectPlanning(String(planning.planning_id))}
                    title={disabled ? t('planning.flightRequests.noDroneId') : undefined}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors text-xs
                      ${disabled
                        ? isDark ? 'opacity-40 cursor-not-allowed text-slate-500' : 'opacity-40 cursor-not-allowed text-gray-400'
                        : isSelected
                          ? isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-50 text-violet-700'
                          : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-violet-500' : disabled ? isDark ? 'bg-slate-700' : 'bg-gray-200' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
                    <span className="flex-1 min-w-0">
                      <span className="font-mono font-semibold mr-2">PLN-{planning.planning_id}</span>
                      <span className="font-medium">{planning.client_name}</span>
                      {planning.planning_desc && <span className={`ml-1 truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>- {planning.planning_desc}</span>}
                    </span>
                    {disabled ? (
                      <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-600' : 'bg-gray-100 text-gray-400'}`}>
                        {t('planning.flightRequests.noDroneId')}
                      </span>
                    ) : (
                      <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                        {planning.planning_status}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onConfirm} disabled={!selectedEvalId || submitting} className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white">
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {t('common.confirm')}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} className={`h-8 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
