// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
var docs = defineDocs({
  dir: "content/docs"
});
var docsIt = defineDocs({
  dir: "src/locales/docs/it"
});
var source_config_default = defineConfig();
export {
  source_config_default as default,
  docs,
  docsIt
};
