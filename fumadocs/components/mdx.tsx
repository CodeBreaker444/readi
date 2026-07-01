import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Cards, Card } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import type { MDXComponents } from 'mdx/types';
import React from 'react';

export const Note = (props: any) => <Callout type="info" {...props} />;
export const Warning = (props: any) => <Callout type="warn" {...props} />;

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Cards,
    Card,
    Note,
    Warning,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

