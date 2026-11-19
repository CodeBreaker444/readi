import { Download } from 'lucide-react';

function DownloadLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      download
      className="flex w-full items-center gap-1.5 rounded-lg border border-fd-border bg-fd-card px-3 py-1.5 text-xs font-medium text-fd-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      <Download className="size-3.5" />
      {label}
    </a>
  );
}

/** PDF download buttons shown under "On this page". "Download all docs" only appears on the introduction page. */
export function DocsDownloadMenu({ slug, showAll = false }: { slug: string[]; showAll?: boolean }) {
  const slugParam = encodeURIComponent(slug.join('/'));
  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-fd-border pt-4">
      <DownloadLink label="Download this page (PDF)" href={`/api/docs/export?scope=page&slug=${slugParam}&format=pdf`} />
      {showAll && <DownloadLink label="Download all docs (PDF)" href="/api/docs/export?scope=all&format=pdf" />}
    </div>
  );
}
