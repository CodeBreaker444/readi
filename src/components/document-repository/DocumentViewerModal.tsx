'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/useTheme';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

interface Props {
  open: boolean;
  onClose: () => void;
  revId: number | null;
  fileName?: string | null;
  title?: string | null;
}

export function DocumentViewerModal({ open, onClose, revId, fileName, title }: Props) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !revId) { setUrl(null); return; }
    setLoading(true);
    setError(false);
    axios.post('/api/document/presign-download', { rev_id: revId, inline: true })
      .then(({ data }) => {
        if (data?.url) setUrl(data.url);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, revId]);

  const ext = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  const isPdf = ext === 'pdf';
  const isImage = IMAGE_EXTENSIONS.includes(ext);
  const canPreview = isPdf || isImage;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'w-[95vw] sm:max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden',
          isDark ? 'bg-slate-800 border-slate-700' : '',
        )}
      >
        <DialogHeader className={cn('px-4 py-3 border-b shrink-0', isDark ? 'border-slate-700/60' : 'border-gray-100')}>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle
              className={cn('text-sm font-semibold truncate', isDark ? 'text-white' : '')}
              title={title ?? fileName ?? ''}
            >
              {title ?? fileName ?? t('repository.viewer.title')}
            </DialogTitle>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'shrink-0 text-xs flex items-center gap-1',
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" /> {t('repository.viewer.openInNewTab')}
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : error || !url ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              {t('repository.viewer.loadError')}
            </div>
          ) : !canPreview ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-slate-400">
              <p>{t('repository.viewer.noPreview')}</p>
              <Button asChild size="sm" variant="outline">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5 mr-1.5" />{t('repository.actions.download')}
                </a>
              </Button>
            </div>
          ) : isPdf ? (
            <iframe src={url} title={fileName ?? 'document'} className="w-full h-full border-0" />
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto bg-black/5">
              <img src={url} alt={fileName ?? 'document'} className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
