'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { AiEventItem, AiFeedbackType } from '@/config/types/ai-event';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Download, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { eventUi } from './event-ui';

const FEEDBACK_MAX_FILES = 2;
const FEEDBACK_MAX_BYTES = 5 * 1024 * 1024;
const FEEDBACK_ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';

function fmtSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}


export function AiDetectionFeedback({ event, isDark, onSaved }: { event: AiEventItem; isDark: boolean; onSaved: () => Promise<void> | void }) {
  const { t } = useTranslation();
  const a = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.ai.${key}`, opts);
  const ui = eventUi(isDark);
  const fb = event.feedback;
  const [editing, setEditing] = useState(!fb);
  const [type, setType] = useState<AiFeedbackType | null>(fb?.feedback_type ?? null);
  const [comment, setComment] = useState(fb?.comment ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(!event.feedback);
    setType(event.feedback?.feedback_type ?? null);
    setComment(event.feedback?.comment ?? '');
    setFiles([]);
  }, [event.ai_event_id, event.feedback?.updated_at]);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!FEEDBACK_ACCEPT.split(',').includes(f.type)) {
        toast.error(a('feedbackFileType'));
        continue;
      }
      if (f.size > FEEDBACK_MAX_BYTES) {
        toast.error(a('feedbackFileSize', { name: f.name }));
        continue;
      }
      if (next.length >= FEEDBACK_MAX_FILES) {
        toast.error(a('feedbackFileMax', { count: FEEDBACK_MAX_FILES }));
        break;
      }
      next.push(f);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async () => {
    if (!type) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('feedback_type', type);
      form.append('comment', comment.trim());
      files.forEach((f) => form.append('files', f));
      await axios.post(`/api/logbooks/event/ai/${event.ai_event_id}/feedback`, form);
      toast.success(a('feedbackSaved'));
      await onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? a('feedbackError'));
    } finally {
      setSaving(false);
    }
  };

  const pills: AiFeedbackType[] = ['false_positive', 'false_negative'];

  if (fb && !editing) {
    return (
      <div className="space-y-3 pt-2">
        <div className={cn('space-y-3 rounded-lg border p-3 text-xs', ui.divider)}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-600">{a(`feedback_${fb.feedback_type}`)}</Badge>
            <span className={ui.muted}>{a('byUser', { name: fb.user_email })}</span>
            <span className={ui.faint}>{new Date(fb.updated_at).toLocaleString()}</span>
          </div>
          {fb.comment && <p className={cn('whitespace-pre-wrap break-words', ui.text)}>{fb.comment}</p>}
          {fb.attachments.length > 0 && (
            <ul className="space-y-1">
              {fb.attachments.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-2">
                  <a href={f.url ?? undefined} target="_blank" rel="noreferrer" className={cn('inline-flex min-w-0 items-center gap-1.5 underline-offset-2 hover:underline', ui.text)}>
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className={ui.faint}>({fmtSize(f.size)})</span>
                  </a>
                  {f.download_url && (
                    <a href={f.download_url} download aria-label={a('feedbackDownload')} title={a('feedbackDownload')} className={cn('shrink-0 hover:text-violet-500', ui.muted)}>
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className={cn('h-8 text-xs', ui.outlineBtn)} onClick={() => setEditing(true)}>
            {a('feedbackEdit')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <p className={cn('text-xs', ui.muted)}>{a('feedbackIntro')}</p>
      <div className="space-y-2">
        <div className={ui.label}>{a('feedbackType')}</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={a('feedbackType')}>
          {pills.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={type === p}
              disabled={saving}
              onClick={() => setType(p)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                type === p ? 'border-violet-600 bg-violet-600 text-white' : cn('hover:border-violet-500/60', ui.outlineBtn),
              )}
            >
              {a(`feedback_${p}`)}
            </button>
          ))}
        </div>
        {type && <p className={cn('text-[11px]', ui.faint)}>{a(`feedbackHint_${type}`)}</p>}
      </div>
      <div className="space-y-2">
        <div className={ui.label}>{a('feedbackComments')}</div>
        <Textarea
          value={comment}
          maxLength={1000}
          rows={3}
          disabled={saving}
          onChange={(ev) => setComment(ev.target.value)}
          placeholder={a('feedbackCommentsPlaceholder')}
          className={cn('text-xs', ui.input)}
        />
      </div>
      <div className="space-y-2">
        <div className={ui.label}>{a('feedbackAttach', { count: FEEDBACK_MAX_FILES })}</div>
        <input ref={fileInput} type="file" multiple accept={FEEDBACK_ACCEPT} className="hidden" onChange={(ev) => pick(ev.target.files)} />
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className={cn('flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs', ui.divider)}>
            <span className={cn('flex min-w-0 items-center gap-1.5', ui.text)}>
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{f.name}</span>
              <span className={ui.faint}>({fmtSize(f.size)})</span>
            </span>
            <button type="button" aria-label={a('feedbackRemoveFile')} disabled={saving} className={ui.muted} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {fb && files.length === 0 && fb.attachments.length > 0 && <p className={cn('text-[11px]', ui.faint)}>{a('feedbackKeepFiles', { count: fb.attachments.length })}</p>}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('h-8 gap-1.5 text-xs', ui.outlineBtn)}
          disabled={saving || files.length >= FEEDBACK_MAX_FILES}
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5" />
          {a('feedbackChoose')}
        </Button>
        <p className={cn('text-[11px]', ui.faint)}>{a('feedbackFileRules')}</p>
      </div>
      <div className="flex justify-end gap-2">
        {fb && (
          <Button size="sm" variant="outline" className={cn('h-8 text-xs', ui.outlineBtn)} disabled={saving} onClick={() => setEditing(false)}>
            {a('cancel')}
          </Button>
        )}
        <Button size="sm" className="h-8 gap-1.5 bg-violet-600 text-xs text-white hover:bg-violet-700" disabled={!type || saving} onClick={submit}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {a('feedbackSubmit')}
        </Button>
      </div>
    </div>
  );
}
