'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';
import it from '@/locales/it.json';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', countryCode: 'gb' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', countryCode: 'it' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', countryCode: 'de' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'readi_language';

function getSavedLanguage(): LanguageCode {
  return 'en';
}

export function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as LanguageCode;
  return 'en';
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      it: { translation: it },
      de: { translation: de },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
} else {
  // In dev/HMR the i18n instance might already be initialized.
  // Ensure resource bundles are up to date (new keys in JSON files).
  i18n.addResourceBundle('en', 'translation', en, true, true);
  i18n.addResourceBundle('it', 'translation', it, true, true);
  i18n.addResourceBundle('de', 'translation', de, true, true);
}

export function changeLanguage(code: LanguageCode) {
  i18n.changeLanguage(code);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, code);
  }
}

export default i18n;
