'use client';

import i18n, { getStoredLanguage } from '@/lib/i18n/config';
import { useEffect } from 'react';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lang = getStoredLanguage();
    if (lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }, []);

  return <>{children}</>;
}
