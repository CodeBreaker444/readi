import DccErrorToast from '@/components/dcc/DccErrorToast';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { createElement } from 'react';
import { toast } from 'sonner';

export type { DccCallbackResult };

const MAX_BODY = 500;

function truncate(s: string): string {
  if (s.length <= MAX_BODY) return s;
  return `${s.slice(0, MAX_BODY)}…`;
}

export function formatDccToastDescription(dcc: DccCallbackResult | null | undefined): string | undefined {
  if (!dcc) return undefined;
  const parts: string[] = [`DCC ${dcc.path}`, dcc.message];
  if (dcc.httpStatus != null) parts.push(`HTTP ${dcc.httpStatus}`);
  if (dcc.responseBody?.trim()) parts.push(`Body: ${truncate(dcc.responseBody.trim())}`);
  return parts.join(' · ');
}

/** Show a persistent DCC error toast  no auto dismiss, click to see details and report. */
function showDccErrorToast(title: string, dcc: DccCallbackResult) {
  toast.custom(
    (toastId) => createElement(DccErrorToast, { toastId, title, dcc }),
    { duration: Infinity },
  );
}

/** Show primary toast + optional DCC detail */
export function toastWithDcc(
  outcomeToast: { title: string; variant: 'success' | 'error' },
  dcc: DccCallbackResult | null | undefined,
) {
  const dccDesc = formatDccToastDescription(dcc);
  const show = outcomeToast.variant === 'success' ? toast.success : toast.error;
  if (dcc?.outcome === 'http_error' || dcc?.outcome === 'network_error') {
    showDccErrorToast(outcomeToast.title, dcc);
    return;
  }
  if (dcc?.outcome === 'skipped') {
    toast.success(outcomeToast.title, { description: dccDesc, duration: 6000 });
    return;
  }
  show(outcomeToast.title, { description: dccDesc, duration: dccDesc ? 6000 : 4000 });
}

/** After a successful API action that optionally called DCC */
export function toastAfterDccAction(mainTitle: string, dcc: DccCallbackResult | null | undefined) {
  const desc = formatDccToastDescription(dcc);
  if (!dcc) {
    toast.success(mainTitle);
    return;
  }
  if (dcc.outcome === 'http_error' || dcc.outcome === 'network_error') {
    showDccErrorToast(mainTitle, dcc);
    return;
  }
  toast.success(mainTitle, { description: desc, duration: 6500 });
}
