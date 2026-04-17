'use client';

import '@/lib/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // i18next is initialized by importing the config above.
  // This component exists purely to ensure the config import runs
  // on the client before any child renders.
  return <>{children}</>;
}
