import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Cards, Card } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Rocket, LayoutGrid, Settings, Workflow, ShieldCheck, FolderArchive } from 'lucide-react';
import type { MDXComponents } from 'mdx/types';
import React from 'react';

export const Note = (props: any) => <Callout type="info" {...props} />;
export const Warning = (props: any) => <Callout type="warn" {...props} />;
export const Danger = (props: any) => <Callout type="error" {...props} />;
export const Success = (props: any) => <Callout type="success" {...props} />;

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Cards,
    Card,
    Callout,
    Note,
    Warning,
    Danger,
    Success,
    Step,
    Steps,
    Tab,
    Tabs,
    Accordion,
    Accordions,
    File,
    Files,
    Folder,
    TypeTable,
    Rocket,
    LayoutGrid,
    Settings,
    Workflow,
    ShieldCheck,
    FolderArchive,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
