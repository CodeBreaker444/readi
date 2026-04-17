'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import axios from 'axios';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export type ProcedureName =
  | 'operation'
  | 'mission'
  | 'evaluation'
  | 'planning'
  | 'vehicle'
  | 'mission_plan'
  | 'mission_emergency';

interface RecipientOption {
  id: number;
  name: string;
  role: string;
  email: string;
  text: string;
}

interface GeneralCommunicationDialogProps {
  open: boolean;
  onClose: () => void;
  procedureName?: ProcedureName;
  fkEvaluationId?: number;
  fkPlanningId?: number;
  fkMissionId?: number;
  fkVehicleId?: number;
  fkClientId?: number;
}

export default function GeneralCommunicationDialog({
  open,
  onClose,
  procedureName = 'operation',
  fkEvaluationId = 0,
  fkPlanningId = 0,
  fkMissionId = 0,
  fkVehicleId = 0,
  fkClientId = 0,
}: GeneralCommunicationDialogProps) {
  const { t } = useTranslation();
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientOption[]>([]);
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<'info' | 'warning' | 'danger'>('info');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newId, setNewId] = useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const LEVEL_OPTIONS = [
    { value: 'info', label: t('planning.communication.info'), icon: Info, color: 'text-blue-600' },
    { value: 'warning', label: t('planning.communication.warning'), icon: AlertTriangle, color: 'text-amber-600' },
    { value: 'danger', label: t('planning.communication.issue'), icon: AlertCircle, color: 'text-rose-600' },
  ];

  useEffect(() => {
    if (!open) return;
    reset();

    setLoadingRecipients(true);
    axios
      .get(`/api/operation/communication/recipients?procedure=${procedureName}`)
      .then((r) => setRecipients(r.data.recipients ?? []))
      .catch(() => toast.error(t('planning.communication.loadError')))
      .finally(() => setLoadingRecipients(false));
  }, [open, procedureName, t]);

  function reset() {
    setSelectedRecipients([]);
    setMessage('');
    setLevel('info');
    setFile(null);
    setSuccess(false);
    setNewId(null);
  }

  function toggleRecipient(opt: RecipientOption) {
    setSelectedRecipients((prev) =>
      prev.find((r) => r.id === opt.id)
        ? prev.filter((r) => r.id !== opt.id)
        : [...prev, opt]
    );
  }

  async function handleSend() {
    if (!message.trim()) {
      toast.error(t('planning.communication.messageRequired'));
      return;
    }
    if (selectedRecipients.length === 0) {
      toast.error(t('planning.communication.recipientRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('procedure_name', procedureName);
      fd.append('fk_evaluation_id', String(fkEvaluationId));
      fd.append('fk_planning_id', String(fkPlanningId));
      fd.append('fk_mission_id', String(fkMissionId));
      fd.append('fk_vehicle_id', String(fkVehicleId));
      fd.append('fk_client_id', String(fkClientId));
      fd.append('communication_message', message);
      fd.append('communication_level', level);
      selectedRecipients.forEach((r) =>
        fd.append('communication_to[]', String(r.id))
      );
      if (file) fd.append('communication_file', file);

      const { data } = await axios.post('/api/operation/communication', fd);
      if (data.code === 1) {
        setSuccess(true);
        setNewId(data.newId ?? null);
        toast.success(t('planning.communication.sendSuccess'));
      } else {
        toast.error(data.message ?? t('planning.communication.sendError'));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? t('planning.communication.sendError'));
    } finally {
      setSubmitting(false);
    }
  }

  const activeLevelMeta = LEVEL_OPTIONS.find((l) => l.value === level)!;
  const ActiveIcon = activeLevelMeta.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            {t('planning.communication.newCommunication')}
            <Badge variant="outline" className="ml-auto font-normal text-xs mr-5 capitalize">
              {procedureName.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {!success ? (
          <div className="px-6 py-5 space-y-5">
            <div>
              <Label className="mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {t('planning.communication.to')}
                {selectedRecipients.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                    {selectedRecipients.length}
                  </Badge>
                )}
              </Label>
              <div className="rounded-lg border bg-muted/20 p-3 min-h-[72px]">
                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedRecipients.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 text-xs px-2 py-0.5 rounded-full"
                      >
                        {r.name}
                        {r.role && <span className="opacity-70">— {r.role}</span>}
                        <button
                          onClick={() => toggleRecipient(r)}
                          className="hover:text-violet-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {loadingRecipients ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('operations.calendar.loading')}
                  </div>
                ) : (
                  <Select
                    onValueChange={(val) => {
                      const opt = recipients.find((r) => String(r.id) === val);
                      if (opt) toggleRecipient(opt);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder={t('planning.communication.searchUsers')} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients
                        .filter((r) => !selectedRecipients.find((s) => s.id === r.id))
                        .map((r) => (
                          <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                            <span className="font-medium">{r.name}</span>
                            {r.role && <span className="text-muted-foreground ml-1">— {r.role}</span>}
                            {r.email && <span className="text-muted-foreground ml-1">({r.email})</span>}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">{t('planning.communication.message')}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('planning.communication.writeMessage')}
                rows={5}
                className="resize-none"
              />
            </div>

            <div>
              <Label className="mb-2 block">{t('planning.communication.level')}</Label>
              <div className="flex gap-2">
                {LEVEL_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setLevel(opt.value as typeof level)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                        level === opt.value
                          ? cn('bg-muted border-foreground/30 shadow-sm', opt.color)
                          : 'text-muted-foreground hover:text-foreground border-transparent'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">{t('planning.communication.uploadFile')}</Label>
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors',
                  file
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-muted-foreground/25 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10'
                )}
                onClick={() =>
                  document.getElementById('comm-file-input')?.click()
                }
              >
                <input
                  id="comm-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Paperclip className={cn('h-4 w-4 shrink-0', file ? 'text-emerald-600' : 'text-muted-foreground')} />
                {file ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{t('planning.files.provideDescFile')}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <Send className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="font-semibold text-base">{t('planning.communication.sentSuccess')}</p>
            {newId && (
              <p className="text-sm text-muted-foreground">
                {t('planning.communication.message')} #{newId} delivered.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            {success ? t('planning.actions.update') : t('planning.form.no')}
          </Button>

          {!success && (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={submitting || loadingRecipients || !message.trim() || selectedRecipients.length === 0}
              className={cn(
                'gap-2 min-w-[120px] text-white',
                level === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : level === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-violet-600 hover:bg-violet-700'
              )}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t('planning.communication.sending')}</>
              ) : (
                <>
                  <ActiveIcon className="h-4 w-4" />
                  {t('planning.communication.send')} {activeLevelMeta.label}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}