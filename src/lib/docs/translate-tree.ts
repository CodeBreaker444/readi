import type { ReactNode } from 'react';
import { getLocaleKey, getLocalizedDoc, getUiStrings, type DocsLang } from './locale';
import { sourceIt } from './source';

/** Title of a docs page (by url) in the given language, falling back to the English title. */
export function getTranslatedTitle(url: string, fallback: string, lang: DocsLang): string {
  if (lang === 'en') return fallback;
  const slug = url.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
  return getLocalizedDoc(getLocaleKey(slug), lang)?.title ?? sourceIt.getPage(slug)?.data.title ?? fallback;
}

interface TreeNode {
  type: string;
  name?: ReactNode;
  url?: string;
  index?: TreeNode;
  children?: TreeNode[];
  [key: string]: unknown;
}

/** Returns a copy of the docs page tree (sidebar) with page and folder titles translated. */
export function translateTree<T extends { children: unknown[] }>(tree: T, lang: DocsLang): T {
  // fumadocs memoizes the tree on the client by `$id`, so each language needs its own id or the sidebar never updates.
  const $id = `docs-tree-${lang}`;
  if (lang === 'en') return { ...tree, $id };
  const folders = getUiStrings(lang).folders;

  const walk = (node: TreeNode): TreeNode => {
    if (node.type === 'page' && node.url && typeof node.name === 'string') {
      return { ...node, name: getTranslatedTitle(node.url, node.name, lang) };
    }
    if (node.type === 'folder') {
      const name = typeof node.name === 'string' ? (folders[node.name] ?? node.name) : node.name;
      return {
        ...node,
        name,
        index: node.index ? walk(node.index) : node.index,
        children: node.children?.map(walk),
      };
    }
    return node;
  };

  return { ...tree, $id, children: tree.children.map((c) => walk(c as TreeNode)) };
}
