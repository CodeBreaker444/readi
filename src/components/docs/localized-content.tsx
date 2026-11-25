import { Fragment, type ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import { LayoutGrid, Rocket, Settings, Workflow } from 'lucide-react';
import { slugifyHeading, type DocBlock } from '@/lib/docs/locale';

const ICONS: Record<string, ReactNode> = {
  Rocket: <Rocket />,
  LayoutGrid: <LayoutGrid />,
  Settings: <Settings />,
  Workflow: <Workflow />,
};

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** Renders the small inline markdown subset used in locale files: **bold**, `code` and [text](href). */
export function Inline({ text }: { text: string }) {
  const A = defaultMdxComponents.a as React.ElementType;
  return (
    <>
      {text.split(INLINE).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return (
            <A key={i} href={link[2]}>
              {link[1]}
            </A>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export function LocalizedContent({ blocks }: { blocks: DocBlock[] }) {
  const H2 = defaultMdxComponents.h2 as React.ElementType;

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'p':
            return (
              <p key={i}>
                <Inline text={block.text} />
              </p>
            );
          case 'h2':
            return (
              <H2 key={i} id={slugifyHeading(block.text)}>
                {block.text}
              </H2>
            );
          case 'hr':
            return <hr key={i} />;
          case 'ul':
          case 'ol': {
            const List = block.type;
            return (
              <List key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case 'table':
            return (
              <table key={i}>
                <thead>
                  <tr>
                    {block.headers.map((h, j) => (
                      <th key={j}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c}>
                          <Inline text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'cards':
            return (
              <Cards key={i}>
                {block.items.map((card, j) => (
                  <Card key={j} icon={ICONS[card.icon]} title={card.title} href={card.href}>
                    {card.text}
                  </Card>
                ))}
              </Cards>
            );
          case 'note':
            return (
              <Callout key={i} type="info">
                <Inline text={block.text} />
              </Callout>
            );
        }
      })}
    </>
  );
}
