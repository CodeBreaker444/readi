'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ViewerMedia {
  file_name: string;
  file_type: string | null;
  url: string;
  download_url?: string;
}

export const isImageMedia = (m: Pick<ViewerMedia, 'file_type'>) => !!m.file_type?.startsWith('image/');
export const isVideoMedia = (m: Pick<ViewerMedia, 'file_type'>) => !!m.file_type?.startsWith('video/');
/** Images and videos open in the viewer; anything else (PDF) opens in a new tab. */
export const isViewableMedia = (m: Pick<ViewerMedia, 'file_type'>) => isImageMedia(m) || isVideoMedia(m);

interface Props {
  items: ViewerMedia[];
  /** Index of the item being shown; null keeps the viewer closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

/** Lightbox for event images and videos with previous/next navigation. */
export function MediaViewer({ items, index, onIndexChange }: Props) {
  const { t } = useTranslation();
  const open = index != null && items[index] != null;
  const item = open ? items[index!] : null;
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [index]);

  const go = (delta: number) => {
    if (index == null || items.length < 2) return;
    onIndexChange((index + delta + items.length) % items.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, items.length]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onIndexChange(null)}>
      <DialogContent className="flex max-h-[95vh] flex-col gap-3 border-slate-700 bg-slate-950 p-3 text-slate-100 sm:max-w-5xl">
        <DialogTitle className="truncate pr-8 text-sm font-medium">{item?.file_name}</DialogTitle>
        <DialogDescription className="sr-only">{t('logbooks.eventLogbook.viewer.description')}</DialogDescription>

        <div className="relative flex min-h-[40vh] flex-1 items-center justify-center overflow-hidden rounded-md bg-black">
          {item &&
            (broken ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-400">
                <FileText className="h-8 w-8" />
                {t('logbooks.eventLogbook.viewer.failed')}
              </div>
            ) : isVideoMedia(item) ? (
              // key forces a fresh player when navigating between videos
              <video key={item.url} src={item.url} controls autoPlay playsInline className="max-h-[75vh] w-full" onError={() => setBroken(true)} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={item.url} src={item.url} alt={item.file_name} className="max-h-[75vh] max-w-full object-contain" onError={() => setBroken(true)} />
            ))}

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t('logbooks.eventLogbook.viewer.previous')}
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={t('logbooks.eventLogbook.viewer.next')}
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <div className={cn('flex items-center justify-between text-xs text-slate-400')}>
          <span>{index != null ? `${index + 1} / ${items.length}` : ''}</span>
          {item?.download_url && (
            <a href={item.download_url} download={item.file_name} className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300">
              <Download className="h-3.5 w-3.5" />
              {t('logbooks.eventLogbook.detail.download')}
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
