'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  EVENT_ATTACHMENT_MAX_BYTES,
  EVENT_SUPPORT_MEDIA_ALLOWED_TYPES,
  EVENT_SUPPORT_MEDIA_MAX_PER_UPLOAD,
} from '@/config/types/event-logbook';
import { uploadEventFiles } from '@/lib/event-logbook-upload';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Film, Loader2, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { eventUi } from './event-ui';

interface Props {
  /** Event the media is added to; null keeps the dialog closed. */
  eventId: number | null;
  isDark: boolean;
  onClose: () => void;
  /** Called after the media was saved so the caller can refresh. */
  onAdded: () => void;
}

interface Pending {
  id: string;
  file: File;
  previewUrl: string | null;
}

/** Adds supporting images/videos to a reported event. Nobody is emailed; the client's webhook gets the new media. */
export function AddSupportMediaDialog({ eventId, isDark, onClose, onAdded }: Props) {
  const { t } = useTranslation();
  const ui = eventUi(isDark);
  const m = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.supportMedia.${key}`, opts);

  const [files, setFiles] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const filesRef = useRef<Pending[]>([]);
  filesRef.current = files;

  // Start empty each time the dialog opens or closes.
  useEffect(() => {
    return () => filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
  }, [eventId]);
  useEffect(() => setFiles([]), [eventId]);

  const add = (list: FileList | File[]) => {
    const accepted: Pending[] = [];
    for (const file of Array.from(list)) {
      if (!EVENT_SUPPORT_MEDIA_ALLOWED_TYPES.includes(file.type) || file.size > EVENT_ATTACHMENT_MAX_BYTES) {
        toast.error(m('rejected', { name: file.name }));
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      });
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, EVENT_SUPPORT_MEDIA_MAX_PER_UPLOAD));
  };

  const remove = (id: string) =>
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });

  const save = async () => {
    if (eventId == null || files.length === 0) return;
    setSaving(true);
    try {
      const media = await uploadEventFiles(files.map((f) => f.file), 'support');
      await axios.post(`/api/logbooks/event/${eventId}/media`, { media });
      toast.success(m('added'));
      onAdded();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? m('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={eventId != null} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto sm:max-w-lg', ui.dialog)}>
        <DialogHeader>
          <DialogTitle>{m('title', { id: eventId ?? '' })}</DialogTitle>
          <DialogDescription>{m('description')}</DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            add(e.dataTransfer.files);
          }}
          className={cn(
            'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors',
            dragging ? 'border-violet-500 bg-violet-500/10' : 'border-slate-300 hover:border-violet-400 dark:border-slate-600',
          )}
        >
          <UploadCloud className={cn('h-7 w-7', ui.faint)} />
          <p className="text-sm font-medium">
            {m('dropHere')} <span className="text-xs font-normal text-violet-600">{m('orBrowse')}</span>
          </p>
          <p className={cn('text-[11px]', ui.faint)}>{m('supported', { count: EVENT_SUPPORT_MEDIA_MAX_PER_UPLOAD })}</p>
          <input
            ref={input}
            type="file"
            multiple
            hidden
            accept={EVENT_SUPPORT_MEDIA_ALLOWED_TYPES.join(',')}
            onChange={(e) => {
              if (e.target.files) add(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f) => (
              <li key={f.id} className="relative h-20 w-24 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                {f.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.previewUrl} alt={f.file.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
                    <Film className={cn('h-6 w-6', ui.faint)} />
                    <span className="line-clamp-2 break-all text-[10px]">{f.file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  aria-label={m('remove')}
                  disabled={saving}
                  onClick={() => remove(f.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {m('cancel')}
          </Button>
          <Button className="bg-violet-600 text-white hover:bg-violet-700" disabled={saving || files.length === 0} onClick={save}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {saving ? m('uploading') : m('addButton', { count: files.length })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
