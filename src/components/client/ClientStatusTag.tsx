'use client';

import '@/lib/i18n/config';
import { useTranslation } from 'react-i18next';

interface ClientStatusTagProps {
  /** client.client_active: 'N' marks the client Inactive (admin-controlled). */
  clientActive?: string | null;
  /** The client's portal email has not been activated yet. */
  notActivated?: boolean;
}

/** True when the client can't be picked (client_active = 'N'). */
export const isClientInactive = (clientActive?: string | null) => clientActive === 'N';

/** "(Inactive)" / "(Not activated)" suffix for client dropdown options and filters. */
export function ClientStatusTag({ clientActive, notActivated }: ClientStatusTagProps) {
  const { t } = useTranslation();
  return (
    <>
      {isClientInactive(clientActive) && <span className="ml-2 text-xs text-rose-500">({t('common.inactive')})</span>}
      {notActivated && <span className="ml-2 text-xs text-amber-500">({t('common.notActivated')})</span>}
    </>
  );
}

/** Plain-text version of ClientStatusTag, for options that only take a string label. */
export function clientStatusText(t: (key: string) => string, clientActive?: string | null, notActivated?: boolean): string {
  return `${isClientInactive(clientActive) ? ` (${t('common.inactive')})` : ''}${notActivated ? ` (${t('common.notActivated')})` : ''}`;
}
