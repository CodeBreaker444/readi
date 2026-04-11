import { toast } from 'sonner';
import type { DccCallbackResult } from '@/types/dcc-callback';

export type { DccCallbackResult };

const MAX_BODY = 500;

function truncate(s: string): string {
  if (s.length <= MAX_BODY) return s;
  return `${s.slice(0, MAX_BODY)}…`;
}

/** a second line / description for Sonner from `dcc` on API responses. */
export function formatDccToastDescription(dcc: DccCallbackResult | null | undefined): string | undefined {
  if (!dcc) return undefined;
  const parts: string[] = [`DCC ${dcc.path}`, dcc.message];
  if (dcc.httpStatus != null) parts.push(`HTTP ${dcc.httpStatus}`);
  if (dcc.responseBody?.trim()) parts.push(`Body: ${truncate(dcc.responseBody.trim())}`);
  return parts.join(' · ');
}

/** Show primary toast + optional DCC detail */
export function toastWithDcc(
  outcomeToast: { title: string; variant: 'success' | 'error' },
  dcc: DccCallbackResult | null | undefined,
) {
  const dccDesc = formatDccToastDescription(dcc);
  const show = outcomeToast.variant === 'success' ? toast.success : toast.error;
  if (dcc?.outcome === 'http_error' || dcc?.outcome === 'network_error') {
    show(outcomeToast.title, { description: dccDesc ?? undefined, duration: 8000 });
    return;
  }
  if (dcc?.outcome === 'skipped') {
    toast.success(outcomeToast.title, { description: dccDesc, duration: 6000 });
    return;
  }
  show(outcomeToast.title, { description: dccDesc, duration: dccDesc ? 6000 : 4000 });
}

/** After a successful API action that optionally called DCC — main action succeeded; surface DCC outcome in the toast. */
export function toastAfterDccAction(mainTitle: string, dcc: DccCallbackResult | null | undefined) {
  const desc = formatDccToastDescription(dcc);
  if (!dcc) {
    toast.success(mainTitle);
    return;
  }
  if (dcc.outcome === 'http_error' || dcc.outcome === 'network_error') {
    toast.warning(mainTitle, { description: desc, duration: 9000 });
    return;
  }
  toast.success(mainTitle, { description: desc, duration: 6500 });
}
