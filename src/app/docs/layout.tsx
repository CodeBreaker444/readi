import { source } from '@/lib/docs/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import baseOptions from '@/lib/docs/layout.shared';
import './docs.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout 
        tree={source.getPageTree()} 
        {...baseOptions}
        themeSwitch={{
          enabled: false,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
