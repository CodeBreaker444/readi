import { source, sourceIt } from '@/lib/docs/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/docs/mdx';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { Mermaid } from '@/components/docs/mermaid';
import { DocsDownloadMenu } from '@/components/docs/download-menu';
import { isValidElement, type ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { cookies } from 'next/headers';
import { flattenTree } from 'fumadocs-core/page-tree';
import { getTranslatedTitle } from '@/lib/docs/translate-tree';
import { LocalizedContent } from '@/components/docs/localized-content';
import {
  DOCS_LANG_COOKIE,
  getLocaleKey,
  getLocalizedDoc,
  normalizeDocsLang,
  slugifyHeading,
} from '@/lib/docs/locale';

function extractText(node: ReactNode): string {
  if (typeof node === 'string')
    return node;
  if (typeof node === 'number')
    return String(node);
  if (!node)
    return '';
  if (Array.isArray(node))
    return node.map(extractText).join('');
  if (isValidElement(node))
    return extractText((node.props as any).children);
  return '';
}

function Pre(props: any) {
  const lang = props['data-lang'] || props['data-language'] || '';

  let isMermaid = lang === 'mermaid';
  if (!isMermaid && isValidElement(props.children)) {
    const childProps = (props.children as any).props;
    if (childProps?.className?.includes('language-mermaid')) {
      isMermaid = true;
    }
  }

  if (isMermaid) {
    const code = extractText(props.children);
    return <Mermaid chart={code.trim()} />;
  }

  return <defaultMdxComponents.pre {...props} />;
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const slug = params.slug;
  
  // Handle empty slug - try empty array first, then introduction
  const pageSlug = (!slug || slug.length === 0) ? undefined : slug;
  let page = source.getPage(pageSlug);
  
  // If still not found, try ['introduction']
  if (!page && (!slug || slug.length === 0)) {
    page = source.getPage(['introduction']);
  }
  
  if (!page)
    notFound();

  const lang = normalizeDocsLang((await cookies()).get(DOCS_LANG_COOKIE)?.value);
  const localized = getLocalizedDoc(getLocaleKey(slug), lang);
  // Italian MDX translation of this page, if one exists (otherwise the English page is shown).
  const itPage = lang === 'it' && !localized ? sourceIt.getPage(page.slugs) : undefined;
  const content = itPage ?? page;
  const MDX = content.data.body;
  const toc = localized
    ? localized.blocks.flatMap((b) =>
        b.type === 'h2' ? [{ title: b.text, url: `#${slugifyHeading(b.text)}`, depth: 2 }] : [],
      )
    : content.data.toc;

  // Previous / next page links: same order as the sidebar, with Italian titles when available.
  const titleFor = (url: string, fallback: string) => getTranslatedTitle(url, fallback, lang);
  const flat = flattenTree(source.getPageTree().children);
  const idx = flat.findIndex((n) => n.url === page.url);
  const neighbour = (n: (typeof flat)[number] | undefined) =>
    n ? { name: titleFor(n.url, String(n.name)), url: n.url } : undefined;

  const downloads = (
    <DocsDownloadMenu
      lang={lang}
      slug={page.slugs}
      showAll={page.slugs.length === 0 || (page.slugs.length === 1 && page.slugs[0] === 'introduction')}
    />
  );

  return (
    <DocsPage
      toc={toc}
      full={content.data.full}
      footer={{
        items: idx < 0 ? {} : { previous: neighbour(flat[idx - 1]), next: neighbour(flat[idx + 1]) },
      }}
      tableOfContent={{ footer: downloads }}
      tableOfContentPopover={{ footer: downloads }}
    >
      <DocsTitle>{localized?.title ?? content.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{localized?.description ?? content.data.description}</DocsDescription>
      <DocsBody>
        {localized ? (
          <LocalizedContent blocks={localized.blocks} />
        ) : (
          <MDX
            components={getMDXComponents({
              pre: Pre,
              a: createRelativeLink(source, page),
            })}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const slug = params.slug;
  
  // Handle empty slug - try empty array first, then introduction
  const pageSlug = (!slug || slug.length === 0) ? undefined : slug;
  let page = source.getPage(pageSlug);
  
  // If still not found, try ['introduction']
  if (!page && (!slug || slug.length === 0)) {
    page = source.getPage(['introduction']);
  }
  
  if (!page)
    notFound();

  const lang = normalizeDocsLang((await cookies()).get(DOCS_LANG_COOKIE)?.value);
  const localized = getLocalizedDoc(getLocaleKey(slug), lang);
  const itPage = lang === 'it' && !localized ? sourceIt.getPage(page.slugs) : undefined;
  const content = itPage ?? page;

  return {
    title: localized?.title ?? content.data.title,
    description: localized?.description ?? content.data.description,
  };
}