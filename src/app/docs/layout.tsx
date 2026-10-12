import { source } from '@/lib/docs/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import baseOptions from '@/lib/docs/layout.shared';
import './docs.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider theme={{ forcedTheme: 'dark', enableSystem: false, storageKey: 'docs-theme' }}>
      <DocsLayout 
        tree={source.getPageTree()} 
        {...baseOptions}
        themeSwitch={{
          enabled: true,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
