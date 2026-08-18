import { source } from '@/lib/docs/source';
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
import { isValidElement, type ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';

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

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            pre: Pre,
            a: createRelativeLink(source, page),
          })}
        />
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

  return {
    title: page.data.title,
    description: page.data.description,
  };
}