import en from '@/locales/docs/en.json';
import it from '@/locales/docs/it.json';

export const DOCS_LANGS = [
  { code: 'en', label: 'English', countryCode: 'gb' },
  { code: 'it', label: 'Italiano', countryCode: 'it' },
] as const;

export type DocsLang = (typeof DOCS_LANGS)[number]['code'];

export const DOCS_LANG_COOKIE = 'docs_lang';
export const DEFAULT_DOCS_LANG: DocsLang = 'en';

export function normalizeDocsLang(value: string | undefined | null): DocsLang {
  return DOCS_LANGS.some((l) => l.code === value) ? (value as DocsLang) : DEFAULT_DOCS_LANG;
}

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'hr' }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'cards'; items: { icon: string; title: string; href: string; text: string }[] }
  | { type: 'note'; text: string };

export interface LocalizedDoc {
  title: string;
  description: string;
  blocks: DocBlock[];
}

const CONTENT: Record<DocsLang, Record<string, LocalizedDoc>> = {
  en: en as unknown as Record<string, LocalizedDoc>,
  it: it as unknown as Record<string, LocalizedDoc>,
};

/** Maps a docs slug to a locale content key; undefined when the page has no translation yet. */
export function getLocaleKey(slug: string[] | undefined): string | undefined {
  if (!slug || slug.length === 0) return 'introduction';
  const path = slug.join('/');
  if (path === 'introduction') return 'introduction';
  if (path === 'start-guide/getting-started') return 'getting-started';
  if (path === 'start-guide/key-features') return 'key-features';
  if (path === 'start-guide/system-requirements') return 'system-requirements';
  return undefined;
}

export function getLocalizedDoc(key: string | undefined, lang: DocsLang): LocalizedDoc | undefined {
  if (!key) return undefined;
  return CONTENT[lang][key];
}

export function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface PermissionStrings {
  feature: string;
  customisable: string;
  yes: string;
  no: string;
  /** Translated feature labels by feature key; missing keys fall back to the English label. */
  features: Record<string, string>;
  /** Legend paragraphs (inline markdown: **bold**). */
  legend: string[];
}

/** Strings for the permissions table, stored under `_permissions` in each language file. */
export function getPermissionStrings(lang: DocsLang): PermissionStrings {
  return (CONTENT[lang] as unknown as Record<string, PermissionStrings>)._permissions;
}

export interface UiStrings {
  downloadPage: string;
  downloadAll: string;
  /** Sidebar folder titles, keyed by the English folder title. */
  folders: Record<string, string>;
}

/** Small UI strings used around docs pages, stored under `_ui` in each language file. */
export function getUiStrings(lang: DocsLang): UiStrings {
  return (CONTENT[lang] as unknown as Record<string, UiStrings>)._ui;
}

/** Props for fumadocs' RootProvider `i18n`, translating its built-in labels ("On this page", pagination, search...). */
export function getFumadocsI18n(lang: DocsLang) {
  const translations = (CONTENT[lang] as unknown as Record<string, Record<string, string>>)._fumadocs;
  return lang === 'en' ? undefined : { locale: lang, translations };
}
