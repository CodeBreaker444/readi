import { source } from '@/lib/docs/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import baseOptions from '@/lib/docs/layout.shared';
import Link from 'next/link';
import { Home } from 'lucide-react';
import './docs.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider theme={{ forcedTheme: 'dark', enableSystem: false, storageKey: 'docs-theme' }}>
      <DocsLayout 
        tree={source.getPageTree()} 
        {...baseOptions}
        nav={{
          ...baseOptions.nav,
          title: (
            <>
              <span
                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-sm.png" alt="ReADI Logo" className="h-full w-full object-contain brightness-0 invert" />
              </span>
              Readi Docs
            </>
          ),
          children: (
            <Link
              href="/dashboard"
              aria-label="Back to Readi Dashboard"
              className="group relative mb-auto inline-flex size-7 items-center justify-center rounded-lg text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <Home className="size-4" />
              <span className="pointer-events-none absolute top-full right-0 z-50 mt-1 whitespace-nowrap rounded-md border border-fd-border bg-fd-popover px-2 py-1 text-xs text-fd-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Back to Readi Dashboard
              </span>
            </Link>
          ),
        }}
        sidebar={baseOptions.sidebar}
        themeSwitch={{
          enabled: true,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
