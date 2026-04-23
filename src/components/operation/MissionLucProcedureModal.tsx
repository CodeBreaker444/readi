'use client';

import { AuthorizationModal } from '@/components/authorization/AuthorizationModal';
import { ChecklistRenderer } from '@/components/checklist/ChecklistRenderer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Mission } from '@/config/types/operation';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Send,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

interface OrgUser {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_role?: string;
}


function MissionChecklistModal({
  open,
  missionId,
  checklistId,
  checklistCode,
  checklistName,
  isDark,
  onClose,
  onComplete,
}: {
  open: boolean;
  missionId: number;
  checklistId: number;
  checklistCode: string;
  checklistName: string;
  isDark: boolean;
  onClose: () => void;
  onComplete: (section: Section, code: string) => void;
}) {
  const { t } = useTranslation();
  const [checklistJson, setChecklistJson] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pendingSurveyRef = useRef<any>(null);

  const requiresAuth = checklistJson?.digital_authorization === true;

  useEffect(() => {
    if (!open || !checklistCode) return;
    setChecklistJson(null);
    setLoading(true);
    axios
      .get(`/api/operation/missions/${missionId}/checklist?code=${encodeURIComponent(checklistCode)}`)
      .then(({ data }) => setChecklistJson(data.checklist_json ?? null))
      .catch(() => toast.error(t('planning.evaluation.loadError')))
      .finally(() => setLoading(false));
  }, [open, missionId, checklistCode, t]);

  async function saveCompletion(transactionSignId?: string) {
    setSaving(true);
    try {
      await axios.patch(`/api/operation/missions/${missionId}/luc`, {
        task_type: 'checklist',
        task_code: checklistCode,
        completed: true,
        ...(transactionSignId ? { transaction_sign_id: transactionSignId } : {}),
      });
      toast.success(t('planning.evaluation.savedSuccess'));
      onComplete('checklist', checklistCode);
    } catch {
      toast.error(t('planning.evaluation.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSurveyComplete(survey: any) {
    if (requiresAuth) {
      pendingSurveyRef.current = survey;
      setShowAuthModal(true);
    } else {
      await saveCompletion();
    }
  }

  async function handleAuthSuccess(transactionSignId: string) {
    setShowAuthModal(false);
    await saveCompletion(transactionSignId);
  }

  function handleAuthCancel() {
    setShowAuthModal(false);
    pendingSurveyRef.current = null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
                <FileCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                  {checklistName}
                </DialogTitle>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{checklistCode}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              </div>
            ) : !checklistJson ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <AlertCircle className="h-8 w-8" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {t('planning.evaluation.checklistNotFound')}
                  </p>
                  <p className="text-xs mt-1">
                    {t('planning.evaluation.noChecklistDef')}{' '}
                    <span className="font-mono">{checklistCode}</span>.
                  </p>
                </div>
              </div>
            ) : (
              <ChecklistRenderer
                checklistJson={checklistJson}
                onComplete={handleSurveyComplete}
              />
            )}
          </div>
          {saving && (
            <div className="px-6 pb-4 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('planning.evaluation.saving')}…
            </div>
          )}
        </DialogContent>
      </Dialog>

      {requiresAuth && (
        <AuthorizationModal
          open={showAuthModal}
          context={{
            actionType: 'checklist_complete',
            entityType: 'checklist',
            entityId: checklistCode,
            label: `Complete checklist: ${checklistName}`,
          }}
          onSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
          isDark={isDark}
        />
      )}
    </>
  );
}


function MissionAssignmentModal({
  open,
  missionId,
  assignmentCode,
  assignmentName,
  ownerId,
  onClose,
  onComplete,
}: {
  open: boolean;
  missionId: number;
  assignmentCode: string;
  assignmentName: string;
  ownerId: number;
  onClose: () => void;
  onComplete: (section: Section, code: string) => void;
}) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [message, setMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToUserId('');
    setMessage(`Assignment: ${assignmentName}\nMission #${missionId}\n\nPlease review and complete this assignment.`);
    setLoadingUsers(true);
    axios
      .post('/api/evaluation/mission/users', { owner_id: ownerId })
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => toast.error(t('planning.assignment.loadError')))
      .finally(() => setLoadingUsers(false));
  }, [open, missionId, assignmentName, ownerId, t]);

  async function handleAssign() {
    if (!toUserId) { toast.error('Please select a recipient'); return; }
    if (!message.trim()) { toast.error('Message cannot be empty'); return; }
    setSending(true);
    try {
      await axios.post(`/api/operation/missions/${missionId}/assignment`, {
        task_code: assignmentCode,
        task_name: assignmentName,
        to_user_id: Number(toUserId),
        message: message.trim(),
      });
      await axios.patch(`/api/operation/missions/${missionId}/luc`, {
        task_type: 'assignment',
        task_code: assignmentCode,
        completed: true,
      });
      toast.success('Assignment sent successfully');
      onComplete('assignment', assignmentCode);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send assignment');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Assignment Action
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{assignmentCode}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-3.5 py-2">
            <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">Title :</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{assignmentName}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">
              To
              {users.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-500">
                  {users.length}
                </span>
              )}
            </Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 h-8 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading users…
              </div>
            ) : (
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={String(u.user_id)} className="text-xs">
                      {u.first_name} {u.last_name}
                      {u.user_role ? ` — ${u.user_role}` : ''}
                      <span className="text-slate-400 ml-1">({u.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Message</Label>
            <Textarea
              rows={5}
              className="text-xs resize-none"
              placeholder="Write your assignment message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={sending || !toUserId}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? 'Sending…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function MissionCommunicationModal({
  open,
  missionId,
  communicationCode,
  communicationName,
  onClose,
  onComplete,
}: {
  open: boolean;
  missionId: number;
  communicationCode: string;
  communicationName: string;
  onClose: () => void;
  onComplete: (section: Section, code: string) => void;
}) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToUserId('');
    setMessage('');
    setSubject(`[${communicationName}] Mission #${missionId}`);
    setLoadingUsers(true);
    axios
      .post('/api/evaluation/mission/users')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => toast.error(t('planning.communication.loadError')))
      .finally(() => setLoadingUsers(false));
  }, [open, missionId, communicationName, t]);

  async function handleSend() {
    if (!toUserId) { toast.error(t('planning.communication.recipientSingle')); return; }
    if (!message.trim()) { toast.error(t('planning.communication.messageSingle')); return; }
    setSending(true);
    try {
      await axios.post(`/api/operation/missions/${missionId}/communication`, {
        to_user_id: Number(toUserId),
        subject: subject.trim(),
        message: message.trim(),
        task_code: communicationCode,
        task_name: communicationName,
      });
      await axios.patch(`/api/operation/missions/${missionId}/luc`, {
        task_type: 'communication',
        task_code: communicationCode,
        completed: true,
      });
      toast.success(t('planning.communication.sentSuccess'));
      onComplete('communication', communicationCode);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('planning.communication.sendError'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 border border-violet-100">
              <MessageSquarePlus className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t('planning.communication.title')}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{communicationCode}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700/30 px-3.5 py-2.5">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">
              {t('planning.communication.linkedTask')}
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{communicationName}</p>
            <p className="font-mono text-xs text-slate-400 mt-0.5">{communicationCode}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">{t('planning.communication.to')}</Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 h-8 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading users…
              </div>
            ) : (
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={String(u.user_id)} className="text-xs">
                      {u.first_name} {u.last_name ?? ''} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">{t('planning.communication.subject')}</Label>
            <Input
              className="h-8 text-xs"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">{t('planning.communication.message')}</Label>
            <Textarea
              rows={5}
              className="text-xs resize-none"
              placeholder={t('planning.communication.writeMessage')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !toUserId}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? 'Sending…' : t('planning.communication.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function TaskRow({
  section,
  code,
  name,
  done,
  isDark,
  onAction,
}: {
  section: Section;
  code: string;
  name: string;
  done: boolean;
  isDark: boolean;
  onAction: () => void;
}) {
  const actionLabel: Record<Section, string> = {
    checklist: 'Complete',
    assignment: 'Assign',
    communication: 'Send',
  };

  const actionIcon: Record<Section, React.ElementType> = {
    checklist: FileCheck,
    assignment: Users,
    communication: MessageSquare,
  };

  const ActionIcon = actionIcon[section];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
      done
        ? isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
        : isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-white'
    }`}>
      <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        done
          ? 'border-emerald-500 bg-emerald-500'
          : isDark ? 'border-slate-500' : 'border-gray-300'
      }`}>
        {done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-snug ${
          done
            ? isDark ? 'text-emerald-400 line-through' : 'text-emerald-700 line-through'
            : isDark ? 'text-slate-200' : 'text-slate-800'
        }`}>{name}</p>
        <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{code}</p>
      </div>

      {!done && (
        <Button
          size="sm"
          onClick={onAction}
          className={`shrink-0 h-7 px-2.5 text-[11px] font-semibold gap-1 ${
            section === 'checklist'
              ? 'bg-violet-600 hover:bg-violet-700 text-white'
              : section === 'assignment'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <ActionIcon className="h-3 w-3" />
          {actionLabel[section]}
        </Button>
      )}
    </div>
  );
}


type ActiveModal =
  | { type: 'none' }
  | { type: 'checklist'; checklistId: number; checklistCode: string; checklistName: string }
  | { type: 'assignment'; assignmentCode: string; assignmentName: string }
  | { type: 'communication'; communicationCode: string; communicationName: string };

export function MissionLucProcedureModal({ mission, isDark, onClose }: Props) {
  const { t } = useTranslation();
  const [procedure, setProcedure] = useState<ProcedureData | null>(null);
  const [progress, setProgress] = useState<Progress>({ checklist: {}, communication: {}, assignment: {} });
  const [allDone, setAllDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: 'none' });

  const SECTIONS: { key: Section; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'checklist',     label: t('planning.tasks.checklist'),     icon: ClipboardList,  color: 'text-violet-500' },
    { key: 'communication', label: t('planning.tasks.communication'), icon: MessageSquare,  color: 'text-blue-500'   },
    { key: 'assignment',    label: t('planning.tasks.assignment'),    icon: Users,          color: 'text-emerald-500' },
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`/api/operation/missions/${mission.mission_id}/luc`)
      .then(({ data }) => {
        if (cancelled) return;
        const raw = data.procedure ?? null;
        if (raw?.procedure_steps) {
          const rawTasks: any[] = Array.isArray(raw.procedure_steps.tasks)
            ? raw.procedure_steps.tasks
            : [];
          raw.procedure_steps.tasks = {
            checklist:     rawTasks.flatMap((t: any) => t.checklist     ?? []),
            assignment:    rawTasks.flatMap((t: any) => t.assignment    ?? []),
            communication: rawTasks.flatMap((t: any) => t.communication ?? []),
          };
        }
        setProcedure(raw);
        setProgress(data.luc_procedure_progress ?? { checklist: {}, communication: {}, assignment: {} });
        setAllDone(!!data.luc_completed_at);
      })
      .catch(() => toast.error(t('planning.evaluation.loadError')))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mission.mission_id, t]);

  function markDone(section: Section, code: string) {
    setProgress(prev => ({
      ...prev,
      [section]: { ...prev[section], [code]: 'Y' },
    }));
    setActiveModal({ type: 'none' });
    axios.get(`/api/operation/missions/${mission.mission_id}/luc`)
      .then(({ data }) => {
        setProgress(data.luc_procedure_progress ?? { checklist: {}, communication: {}, assignment: {} });
        setAllDone(!!data.luc_completed_at);
      })
      .catch(() => {});
  }

  const tasks = procedure?.procedure_steps?.tasks;
  const totalCount = SECTIONS.reduce((acc, s) => acc + (tasks?.[s.key]?.length ?? 0), 0);
  const completedCount = SECTIONS.reduce((acc, s) => {
    const group = progress[s.key] ?? {};
    return acc + Object.values(group).filter((v) => v === 'Y').length;
  }, 0);

  const bg      = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200';
  const divider = isDark ? 'border-slate-700/60' : 'border-gray-100';

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] ${bg}`}
          onClick={(e) => e.stopPropagation()}
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
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'}`}
              >
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
                {t('planning.tasks.allCompleted')}
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
                        {Object.values(progress[key] ?? {}).filter((v) => v === 'Y').length}/{items.length}
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
                            section={key}
                            code={code}
                            name={name}
                            done={done}
                            isDark={isDark}
                            onAction={() => {
                              if (key === 'checklist') {
                                setActiveModal({
                                  type: 'checklist',
                                  checklistId: item.checklist_id,
                                  checklistCode: code,
                                  checklistName: name,
                                });
                              } else if (key === 'assignment') {
                                setActiveModal({
                                  type: 'assignment',
                                  assignmentCode: code,
                                  assignmentName: name,
                                });
                              } else {
                                setActiveModal({
                                  type: 'communication',
                                  communicationCode: code,
                                  communicationName: name,
                                });
                              }
                            }}
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
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className={`h-8 text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}`}
            >
              {t('planning.form.no')}
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-modals rendered outside the backdrop */}
      {activeModal.type === 'checklist' && (
        <MissionChecklistModal
          open
          missionId={mission.mission_id}
          checklistId={activeModal.checklistId}
          checklistCode={activeModal.checklistCode}
          checklistName={activeModal.checklistName}
          isDark={isDark}
          onClose={() => setActiveModal({ type: 'none' })}
          onComplete={markDone}
        />
      )}

      {activeModal.type === 'assignment' && (
        <MissionAssignmentModal
          open
          missionId={mission.mission_id}
          assignmentCode={activeModal.assignmentCode}
          assignmentName={activeModal.assignmentName}
          ownerId={mission.fk_owner_id}
          onClose={() => setActiveModal({ type: 'none' })}
          onComplete={markDone}
        />
      )}

      {activeModal.type === 'communication' && (
        <MissionCommunicationModal
          open
          missionId={mission.mission_id}
          communicationCode={activeModal.communicationCode}
          communicationName={activeModal.communicationName}
          onClose={() => setActiveModal({ type: 'none' })}
          onComplete={markDone}
        />
      )}
    </>
  );
}
