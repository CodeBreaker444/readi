import type { TFunction } from 'i18next';

type ReasonPart =
  | { type: 'date'; date: string }
  | { type: 'flights'; current: number; limit: number }
  | { type: 'hours'; current: number; limit: number };

interface ComponentApiResult {
  message?: string;
  errorKey?: string;
  errorParams?: { reasons?: ReasonPart[]; status?: string };
}

const camel = (status: string) => status.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Message of a failed component save, in the user's language. The server sends an errorKey for the
 * expiry rules; anything else (or an unknown key) falls back to the server's English message.
 */
export function componentErrorMessage(result: ComponentApiResult, t: TFunction, fallback: string, locale?: string): string {
  const base = result.message || fallback;
  if (!result.errorKey) return base;

  const reasons = (result.errorParams?.reasons ?? []).map((r) =>
    r.type === 'date'
      ? t('systems.components.expiryError.reason.date', { date: new Date(r.date + 'T00:00:00').toLocaleDateString(locale) })
      : t(`systems.components.expiryError.reason.${r.type}`, { current: r.current, limit: r.limit }),
  );
  const rawStatus = result.errorParams?.status;
  const status = rawStatus
    ? t(`systems.components.common.statusOptions.${camel(rawStatus)}`, { defaultValue: rawStatus })
    : '';

  return t(`systems.components.expiryError.${result.errorKey}`, {
    reason: reasons.join(t('systems.components.expiryError.and')) || t('systems.components.expiryError.reason.generic'),
    status,
    defaultValue: base,
  });
}
