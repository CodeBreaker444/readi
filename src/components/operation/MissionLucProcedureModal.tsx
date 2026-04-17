'use client';

import { Button } from '@/components/ui/button';
import { Mission } from '@/config/types/operation';
import axios from 'axios';
import { CheckCircle2, ClipboardList, Loader2, MessageSquare, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  mission: Mission;
  isDark: boolean;
  onClose: () => void;
}

interface ProcedureData {
  procedure_id: number;
  procedure_name: string;
  procedure_code: string;
  procedure_steps: {
    tasks: {
      checklist: { checklist_id: number; checklist_code: string; checklist_name: string }[];
      communication: { communication_id: number; communication_code: string; communication_name: string }[];
      assignment: { assignment_id: number; assignment_code: string; assignment_name: string }[];
    };
  } | null;
}

type Progress = Record<string, Record<string, string>>;
type Section = 'checklist' | 'communication' | 'assignment';

function TaskRow({
  code,
  name,
  done,
  saving,
  isDark,
  onToggle,
}: {
  code: string;
  name: string;
  done: boolean;
  saving: boolean;
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
      done
        ? isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
        : isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-white'
    }`}>
      <button
        onClick={onToggle}
        disabled={saving}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          done
            ? 'border-emerald-500 bg-emerald-500'
            : isDark ? 'border-slate-500 hover:border-emerald-400' : 'border-gray-300 hover:border-emerald-500'
        }`}
      >
        {saving
          ? <Loader2 className="h-3 w-3 animate-spin text-white" />
          : done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-snug ${done
          ? isDark ? 'text-emerald-400 line-through' : 'text-emerald-700 line-through'
          : isDark ? 'text-slate-200' : 'text-slate-800'
        }`}>{name}</p>
        <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{code}</p>
      </div>
    </div>
  );
}

export function MissionLucProcedureModal({ mission, isDark, onClose }: Props) {
  const { t } = useTranslation();
  const [procedure, setProcedure] = useState<ProcedureData | null>(null);
  const [progress, setProgress]   = useState<Progress>({ checklist: {}, communication: {}, assignment: {} });
  const [allDone, setAllDone]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);  

  const SECTIONS: { key: Section; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'checklist',     label: t('planning.tasks.checklist'), icon: ClipboardList,   color: 'text-violet-500' },
    { key: 'communication', label: t('planning.tasks.communication'), icon: MessageSquare,   color: 'text-blue-500'   },
    { key: 'assignment',    label: t('planning.tasks.assignment'), icon: Users,           color: 'text-emerald-500' },
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`/api/operation/missions/${mission.mission_id}/luc`)
      .then(({ data }) => {
        if (cancelled) return;
        setProcedure(data.procedure ?? null);
        setProgress(data.luc_procedure_progress ?? { checklist: {}, communication: {}, assignment: {} });
        setAllDone(!!data.luc_completed_at);
      })
      .catch(() => toast.error(t('planning.evaluation.loadError')))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mission.mission_id, t]);

  async function toggle(taskType: Section, code: string, currentDone: boolean) {
    const key = `${taskType}:${code}`;
    setSaving(key);
    try {
      const { data } = await axios.patch(`/api/operation/missions/${mission.mission_id}/luc`, {
        task_type: taskType,
        task_code: code,
        completed: !currentDone,
      });
      setProgress(data.progress);
      setAllDone(data.all_completed);
    } catch {
      toast.error(t('planning.evaluation.updateFailed'));
    } finally {
      setSaving(null);
    }
  }

  const tasks = procedure?.procedure_steps?.tasks;
  const totalCount     = SECTIONS.reduce((acc, s) => acc + (tasks?.[s.key]?.length ?? 0), 0);
  const completedCount = SECTIONS.reduce((acc, s) => {
    const group = progress[s.key] ?? {};
    return acc + Object.values(group).filter(v => v === 'Y').length;
  }, 0);

  const bg      = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60' : 'border-gray-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] ${bg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between px-6 py-4 border-b ${divider}`}>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('planning.form.lucProcedure')}
            </p>
            <h2 className={`text-sm font-semibold mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {procedure?.procedure_name ?? '—'}
            </h2>
            <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {procedure?.procedure_code} · {t('operations.table.detail.missionId')} #{mission.mission_id}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {totalCount > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                allDone
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {completedCount}/{totalCount}
              </span>
            )}
            <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'}`}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* All done banner */}
        {allDone && (
          <div className={`mx-6 mt-4 rounded-xl border px-4 py-3 flex items-center gap-2.5 ${
            isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
          }`}>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {t('planning.tasks.allCompleted')} — {t('operations.board.status.scheduled')}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : !procedure ? (
            <div className={`flex flex-col items-center justify-center py-16 gap-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <ClipboardList className="h-8 w-8 opacity-30" />
              <p className="text-sm">{t('planning.evaluation.noChecklistDef')}</p>
            </div>
          ) : (
            SECTIONS.map(({ key, label, icon: Icon, color }) => {
              const items = tasks?.[key] ?? [];
              if (items.length === 0) return null;

              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {label}
                    </h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                      {Object.values(progress[key] ?? {}).filter(v => v === 'Y').length}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item: any) => {
                      const code = item[`${key}_code`] as string;
                      const name = item[`${key}_name`] as string;
                      const done = (progress[key]?.[code] ?? 'N') === 'Y';
                      return (
                        <TaskRow
                          key={code}
                          code={code}
                          name={name}
                          done={done}
                          saving={saving === `${key}:${code}`}
                          isDark={isDark}
                          onToggle={() => toggle(key, code, done)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t ${divider} flex justify-end`}>
          <Button size="sm" variant="outline" onClick={onClose}
            className={`h-8 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}>
            {t('planning.form.no')}
          </Button>
        </div>
      </div>
    </div>
  );
}