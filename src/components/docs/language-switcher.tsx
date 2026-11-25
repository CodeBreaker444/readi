'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { DOCS_LANGS, DOCS_LANG_COOKIE, type DocsLang } from '@/lib/docs/locale';

function Flag({ code }: { code: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/20x15/${code}.png`}
      srcSet={`https://flagcdn.com/40x30/${code}.png 2x`}
      width={20}
      height={15}
      alt=""
      className="inline-block rounded-[2px] object-cover"
    />
  );
}

export function DocsLanguageSwitcher({ value }: { value: DocsLang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = DOCS_LANGS.find((l) => l.code === value) ?? DOCS_LANGS[0];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function select(lang: DocsLang) {
    setOpen(false);
    if (lang === value) return;
    document.cookie = `${DOCS_LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div ref={ref} className="relative py-1 w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className="flex w-full items-center gap-2.5 rounded-lg border border-fd-border bg-fd-card px-3 py-2 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent disabled:opacity-60"
      >
        <Flag code={current.countryCode} />
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronsUpDown className="size-3.5 text-fd-muted-foreground" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-50 mb-1.5 w-full overflow-hidden rounded-lg border border-fd-border bg-fd-popover p-1 shadow-lg"
        >
          {DOCS_LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === value}
                onClick={() => select(l.code)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fd-popover-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                <Flag code={l.countryCode} />
                <span className="flex-1 text-left">{l.label}</span>
                {l.code === value && <Check className="size-4 text-fd-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
