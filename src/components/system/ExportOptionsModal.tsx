'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportOptions {
  /** Indices (into the original headers) of the columns to include, in original order. */
  columns: number[];
  includeLogo: boolean;
}

interface ExportOptionsModalProps {
  open: boolean;
  format: ExportFormat | null;
  headers: string[];
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (options: ExportOptions) => void;
}

const FORMAT_LABEL: Record<ExportFormat, string> = { csv: 'CSV', xlsx: 'Excel', pdf: 'PDF' };

export default function ExportOptionsModal({
  open,
  format,
  headers,
  busy = false,
  onCancel,
  onConfirm,
}: ExportOptionsModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [includeLogo, setIncludeLogo] = useState(true);

  // Every time the modal opens, start with all columns ticked and the logo on.
  useEffect(() => {
    if (open) {
      setSelected(new Set(headers.map((_, i) => i)));
      setIncludeLogo(true);
    }
    // headers is usually an inline array; only reset on open / column-count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, headers.length]);

  // CSV is plain text and cannot carry an image.
  const logoSupported = format !== 'csv';
  const allSelected = selected.size === headers.length;

  const toggle = (idx: number, checked: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(idx);
      else next.delete(idx);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('export.customise.title', { defaultValue: 'Customise report' })}
            {format ? ` — ${FORMAT_LABEL[format]}` : ''}
          </DialogTitle>
          <DialogDescription>
            {t('export.customise.description', { defaultValue: 'Choose what to include in the downloaded report.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {t('export.customise.columns', { defaultValue: 'Columns' })}
              </span>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={c => setSelected(c ? new Set(headers.map((_, i) => i)) : new Set())}
                  aria-label={t('export.customise.selectAll', { defaultValue: 'Select all' })}
                />
                {t('export.customise.selectAll', { defaultValue: 'Select all' })}
              </label>
            </div>
            <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pr-1">
              {headers.map((h, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selected.has(i)} onCheckedChange={c => toggle(i, c === true)} />
                  <span className="truncate" title={h}>{h || `#${i + 1}`}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <label className={`flex items-center gap-2 text-sm ${logoSupported ? 'cursor-pointer' : 'opacity-50'}`}>
              <Checkbox
                checked={logoSupported && includeLogo}
                disabled={!logoSupported}
                onCheckedChange={c => setIncludeLogo(c === true)}
              />
              {t('export.customise.includeLogo', { defaultValue: 'Include company logo' })}
            </label>
            {!logoSupported && (
              <p className="text-xs opacity-60 mt-1 ml-6">
                {t('export.customise.csvNoLogo', { defaultValue: 'CSV files are plain text and cannot contain a logo.' })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            disabled={busy || selected.size === 0}
            onClick={() =>
              onConfirm({
                columns: [...selected].sort((a, b) => a - b),
                includeLogo: logoSupported && includeLogo,
              })
            }
            className='bg-violet-500 hover:bg-violet-600 cursor-pointer'
          >
            {busy
              ? t('export.exporting')
              : t('export.customise.download', { defaultValue: 'Download' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
