'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { AiEventItem } from '@/config/types/ai-event';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { eventUi } from './event-ui';

interface Props {
  target: AiEventItem | null;
  deleting: boolean;
  isDark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AiEventDeleteDialog({ target, deleting, isDark, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const a = (key: string, opts?: Record<string, unknown>) => t(`logbooks.eventLogbook.ai.${key}`, opts);
  const ui = eventUi(isDark);

  return (
    <AlertDialog open={!!target} onOpenChange={(v) => !v && !deleting && onCancel()}>
      <AlertDialogContent className={ui.dialog}>
        <AlertDialogHeader>
          <AlertDialogTitle>{a('deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{a('deleteBody', { event: target?.event_label, stream: target?.stream_id })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{a('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={(ev) => {
              ev.preventDefault();
              onConfirm();
            }}
          >
            {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {a('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
