'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DFlightErrorDetails } from '@/lib/dflight-toast';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  toastId: string | number;
  title: string;
  details: DFlightErrorDetails;
}

export default function DFlightErrorToast({ toastId, title, details }: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-start gap-3 w-full min-w-[380px] max-w-md rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3.5 shadow-[0_0_14px_3px_rgba(251,191,36,0.55)] select-none"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 leading-snug">{title}</p>
          <p className="text-sm text-amber-800 mt-1 break-words line-clamp-4">{details.reason}</p>
          {details.resultCode != null && (
            <p className="text-xs text-amber-700 mt-1 font-mono">
              {details.resultCodeDesc ?? details.resultKind} · {details.resultCode}
            </p>
          )}
          <button
            type="button"
            className="cursor-pointer mt-2 rounded-md border border-amber-400 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 transition-colors"
            onClick={() => setModalOpen(true)}
          >
            {t('dflightErrorToast.viewDetails')}
          </button>
        </div>
        <button
          type="button"
          aria-label={t('dflightErrorToast.dismiss')}
          className="cursor-pointer shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-900 transition-colors mt-0.5"
          onClick={() => toast.dismiss(toastId)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              {t('dflightErrorToast.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm max-h-[65vh] overflow-y-auto pr-1">
            <Row label={t('dflightErrorToast.labelAction')} value={title} />
            <Row label={t('dflightErrorToast.labelDescription')} value={details.resultDesc ?? details.reason} />
            {details.resultCode != null && (
              <Row label={t('dflightErrorToast.labelResultCode')} value={String(details.resultCode)} mono />
            )}
            {details.resultCodeDesc && (
              <Row label={t('dflightErrorToast.labelResultCodeDesc')} value={details.resultCodeDesc} mono />
            )}
            {details.resultKind && <Row label={t('dflightErrorToast.labelResultKind')} value={details.resultKind} />}
            {details.httpStatus != null && (
              <Row label={t('dflightErrorToast.labelHttpStatus')} value={String(details.httpStatus)} />
            )}
            {details.missionId && <Row label={t('dflightErrorToast.labelMissionId')} value={details.missionId} mono />}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('dflightErrorToast.labelFullResponse')}</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                {details.body ? JSON.stringify(details.body, null, 2) : details.message}
              </pre>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={mono ? 'font-mono text-xs mt-0.5 break-all' : 'mt-0.5 break-words'}>{value}</p>
    </div>
  );
}
