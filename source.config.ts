import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/docs',
});

// Italian translations (MDX), stored with the other locale files.
// Pages missing here fall back to the English docs.
export const docsIt = defineDocs({
  dir: 'src/locales/docs/it',
});

export default defineConfig();
