'use client';

import { changeLanguage, LANGUAGES, LanguageCode } from '@/lib/i18n/config';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  isDark: boolean;
}

function FlagImage({ countryCode, className }: { countryCode: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/20x15/${countryCode}.png`}
      srcSet={`https://flagcdn.com/40x30/${countryCode}.png 2x`}
      width={20}
      height={15}
      alt={countryCode.toUpperCase()}
      className={`rounded-[2px] object-cover ${className ?? ''}`}
      style={{ display: 'inline-block' }}
    />
  );
}

export function LanguageSelect({ isDark }: Props) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code: LanguageCode) => {
    changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t('topbar.language')}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
          isDark
            ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            : 'bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <FlagImage countryCode={current.countryCode} />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown
          size={11}
          className={`transition-transform ${open ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full mt-1.5 w-44 rounded-xl border shadow-2xl z-50 overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-gray-200'
          }`}
        >
          <div
            className={`px-3 py-2 border-b text-[9px] font-bold uppercase tracking-widest ${
              isDark ? 'border-slate-700/60 text-slate-500' : 'border-gray-100 text-gray-400'
            }`}
          >
            {t('topbar.language')}
          </div>
          <div className="p-1">
            {LANGUAGES.map((lang) => {
              const isActive = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[12px] transition-colors ${
                    isActive
                      ? isDark
                        ? 'bg-violet-500/15 border border-violet-500/25 text-violet-300'
                        : 'bg-violet-50 border border-violet-200 text-violet-700'
                      : isDark
                        ? 'hover:bg-slate-800 border border-transparent text-slate-300'
                        : 'hover:bg-gray-50 border border-transparent text-gray-700'
                  }`}
                >
                  <FlagImage countryCode={lang.countryCode} />
                  <span className="flex-1 font-medium">{lang.label}</span>
                  {isActive && (
                    <Check size={12} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
