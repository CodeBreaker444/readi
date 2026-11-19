import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { source as Source } from './source';
import { getPermissionsTableData, PERMISSIONS_LEGEND_TEXT } from '@/components/docs/permissions-table';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');

type Block =
  | { t: 'h'; level: number; text: string }
  | { t: 'p'; text: string }
  | { t: 'li'; text: string; depth: number; marker: string }
  | { t: 'table'; headers: string[]; rows: string[][] }
  | { t: 'code'; text: string }
  | { t: 'callout'; kind: string; text: string }
  | { t: 'hr' };

export interface ExportDoc {
  slugs: string[];
  path: string;  
  title: string;
  description: string;
  blocks: Block[];
}


function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));
}

function parseSections(tag: string): string[] {
  const arr = tag.match(/section=\{\[([^\]]*)\]\}/);
  if (arr) return [...arr[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  const one = tag.match(/section=(?:"([^"]+)"|\{["']([^"']+)["']\})/);
  return one ? [one[1] ?? one[2]] : [];
}

export function mdxToBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: 'p', text: para.join(' ').trim() });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      continue;
    }

    // code fence
    if (trimmed.startsWith('```')) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      blocks.push({ t: 'code', text: code.join('\n') });
      continue;
    }

    // callouts
    const callout = trimmed.match(/^<(Note|Warning|Danger|Success)>(.*)$/);
    if (callout) {
      flush();
      const kind = callout[1];
      const text: string[] = [];
      const first = callout[2];
      if (first.includes(`</${kind}>`)) {
        blocks.push({ t: 'callout', kind, text: first.replace(`</${kind}>`, '').trim() });
        continue;
      }
      if (first.trim()) text.push(first.trim());
      i++;
      while (i < lines.length && !lines[i].includes(`</${kind}>`)) text.push(lines[i++].trim());
      blocks.push({ t: 'callout', kind, text: text.join(' ').trim() });
      continue;
    }

    // permissions table
    if (trimmed.startsWith('<PermissionsTable')) {
      flush();
      let tag = trimmed;
      while (!tag.includes('/>') && i + 1 < lines.length) tag += ' ' + lines[++i].trim();
      const data = getPermissionsTableData(parseSections(tag));
      if (data) {
        blocks.push({ t: 'table', ...data });
        for (const l of PERMISSIONS_LEGEND_TEXT) blocks.push({ t: 'p', text: l });
      }
      continue;
    }

    // cards -> bullet list
    if (/^<\/?Cards>$/.test(trimmed) || trimmed === '</Card>') continue;
    if (trimmed.startsWith('<Card ')) {
      flush();
      const title = trimmed.match(/title="([^"]*)"/)?.[1] ?? '';
      const text: string[] = [];
      while (i + 1 < lines.length && lines[i + 1].trim() !== '</Card>') text.push(lines[++i].trim());
      blocks.push({ t: 'li', text: `**${title}**: ${text.join(' ')}`.trim(), depth: 0, marker: '-' });
      continue;
    }

    // any other stray JSX tag line
    if (/^<\/?[A-Za-z][^>]*>$/.test(trimmed)) continue;

    // heading
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      blocks.push({ t: 'h', level: h[1].length, text: h[2].replace(/\s*\{#[^}]+\}\s*$/, '') });
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ t: 'hr' });
      continue;
    }

    // table
    if (trimmed.startsWith('|') && /^\|?[\s:|-]+\|?$/.test(lines[i + 1]?.trim() ?? '')) {
      flush();
      const headers = splitRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(splitRow(lines[i++]));
      i--;
      blocks.push({ t: 'table', headers, rows });
      continue;
    }

    // list item
    const li = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (li) {
      flush();
      blocks.push({ t: 'li', text: li[3], depth: Math.floor(li[1].replace(/\t/g, '    ').length / 2), marker: /\d/.test(li[2]) ? li[2] : '-' });
      continue;
    }

    // list continuation line (indented text directly under an item)
    const last = blocks[blocks.length - 1];
    if (para.length === 0 && last?.t === 'li' && /^\s+\S/.test(line)) {
      last.text += ' ' + trimmed;
      continue;
    }

    para.push(trimmed.replace(/^>\s?/, ''));
  }
  flush();
  return blocks;
}

// ---------- loading ----------

function flattenTreeUrls(nodes: any[], out: string[] = []): string[] {
  for (const n of nodes) {
    if (n.type === 'page') out.push(n.url);
    else if (n.type === 'folder') {
      if (n.index?.url) out.push(n.index.url);
      flattenTreeUrls(n.children ?? [], out);
    }
  }
  return out;
}

async function loadDoc(page: (typeof Source)['$inferPage']): Promise<ExportDoc> {
  const raw = await fs.readFile(path.join(CONTENT_DIR, page.path), 'utf8');
  const { content } = matter(raw);
  return {
    slugs: page.slugs,
    path: page.path,
    title: page.data.title,
    description: page.data.description ?? '',
    blocks: mdxToBlocks(content),
  };
}

export async function getDocBySlug(slugs: string[]): Promise<ExportDoc | null> {
  const { source } = await import('./source');
  const page = source.getPage(slugs.length ? slugs : undefined) ?? source.getPage(['introduction']);
  return page ? loadDoc(page) : null;
}

/** All docs in sidebar order. */
export async function getAllDocs(): Promise<ExportDoc[]> {
  const { source } = await import('./source');
  const pages = source.getPages();
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const ordered = flattenTreeUrls(source.getPageTree().children as any[])
    .map((u) => byUrl.get(u))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const seen = new Set(ordered.map((p) => p.url));
  for (const p of pages) if (!seen.has(p.url)) ordered.push(p);
  return Promise.all(ordered.map(loadDoc));
}

// ---------- PDF ----------

function clean(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_]+)[*_](?=[\s).,;:]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\\([*_`|])/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0000-ÿ–—•†…]/g, '?');
}

const MARGIN = 44;
const COLORS = { text: [30, 30, 40], muted: [110, 110, 125], accent: [91, 33, 182], rule: [210, 210, 220] } as const;
const CALLOUT_COLORS: Record<string, [number, number, number]> = {
  Note: [59, 130, 246],
  Warning: [217, 119, 6],
  Danger: [220, 38, 38],
  Success: [22, 163, 74],
};

export async function docsToPdf(docs: ExportDoc[], opts: { title: string; subtitle?: string; cover?: boolean }): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > pageH - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const setColor = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);

  const writeText = (text: string, o: { size: number; bold?: boolean; indent?: number; color?: readonly number[]; gap?: number; font?: string }) => {
    doc.setFont(o.font ?? 'helvetica', o.bold ? 'bold' : 'normal');
    doc.setFontSize(o.size);
    setColor(o.color ?? COLORS.text);
    const indent = o.indent ?? 0;
    const lines: string[] = doc.splitTextToSize(clean(text), maxW - indent);
    const lh = o.size * 1.4;
    for (const l of lines) {
      ensure(lh);
      doc.text(l, MARGIN + indent, y + o.size);
      y += lh;
    }
    y += o.gap ?? 6;
  };

  const tocEntries: { title: string; page: number }[] = [];

  if (opts.cover) {
    y = pageH / 3;
    writeText(opts.title, { size: 28, bold: true, color: COLORS.accent, gap: 10 });
    if (opts.subtitle) writeText(opts.subtitle, { size: 12, color: COLORS.muted, gap: 6 });
    writeText(`Generated ${new Date().toISOString().slice(0, 10)}`, { size: 10, color: COLORS.muted });
  }

  docs.forEach((d, idx) => {
    if (opts.cover || idx > 0) {
      doc.addPage();
      y = MARGIN;
    }
    tocEntries.push({ title: d.title, page: doc.getNumberOfPages() });
    writeText(d.title, { size: 22, bold: true, color: COLORS.accent, gap: 4 });
    if (d.description) writeText(d.description, { size: 10.5, color: COLORS.muted, gap: 8 });
    doc.setDrawColor(...COLORS.rule);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    y += 12;

    for (const b of d.blocks) {
      switch (b.t) {
        case 'h': {
          const size = b.level <= 2 ? 15 : b.level === 3 ? 12.5 : 11;
          ensure(size * 1.4 + 30);
          y += b.level <= 2 ? 8 : 4;
          writeText(b.text, { size, bold: true, gap: 4 });
          break;
        }
        case 'p':
          writeText(b.text, { size: 10, gap: 6 });
          break;
        case 'li': {
          const indent = 12 + b.depth * 14;
          const label = b.marker === '-' ? '•' : b.marker;
          const startY = y;
          ensure(14);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          setColor(COLORS.text);
          const startPage = doc.getNumberOfPages();
          writeText(b.text, { size: 10, indent: indent + 8, gap: 2 });
          if (doc.getNumberOfPages() === startPage) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            setColor(COLORS.text);
            doc.text(label, MARGIN + indent - (label.length > 1 ? 6 : 0), startY + 10);
          }
          break;
        }
        case 'table': {
          const wide = b.headers.length > 8;
          autoTable(doc, {
            startY: y,
            head: [b.headers.map(clean)],
            body: b.rows.map((r) => r.map(clean)),
            margin: { left: MARGIN, right: MARGIN },
            styles: { fontSize: wide ? 6 : 8.5, cellPadding: wide ? 2 : 4, overflow: 'linebreak', textColor: [...COLORS.text] },
            headStyles: { fillColor: [...COLORS.accent], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 250] },
          });
          y = ((doc as any).lastAutoTable?.finalY ?? y) + 12;
          break;
        }
        case 'code': {
          const lines: string[] = doc.splitTextToSize(clean(b.text), maxW - 16);
          doc.setFont('courier', 'normal');
          doc.setFontSize(8.5);
          const lh = 8.5 * 1.35;
          let i = 0;
          while (i < lines.length) {
            ensure(lh + 8);
            const fit = Math.max(1, Math.min(lines.length - i, Math.floor((pageH - MARGIN - y - 8) / lh)));
            const h = fit * lh + 8;
            doc.setFillColor(243, 243, 247);
            doc.rect(MARGIN, y, maxW, h, 'F');
            setColor(COLORS.text);
            doc.setFont('courier', 'normal');
            doc.setFontSize(8.5);
            doc.text(lines.slice(i, i + fit), MARGIN + 8, y + 4 + 8.5);
            y += h;
            i += fit;
          }
          y += 8;
          break;
        }
        case 'callout': {
          const col = CALLOUT_COLORS[b.kind] ?? CALLOUT_COLORS.Note;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines: string[] = doc.splitTextToSize(`${b.kind}: ${clean(b.text)}`, maxW - 20);
          const lh = 14;
          let i = 0;
          while (i < lines.length) {
            ensure(lh + 10);
            const fit = Math.max(1, Math.min(lines.length - i, Math.floor((pageH - MARGIN - y - 10) / lh)));
            const h = fit * lh + 10;
            doc.setFillColor(col[0], col[1], col[2]);
            doc.rect(MARGIN, y, 3, h, 'F');
            doc.setFillColor(246, 246, 250);
            doc.rect(MARGIN + 3, y, maxW - 3, h, 'F');
            setColor(COLORS.text);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(lines.slice(i, i + fit), MARGIN + 14, y + 5 + 10);
            y += h;
            i += fit;
          }
          y += 8;
          break;
        }
        case 'hr':
          ensure(14);
          doc.setDrawColor(...COLORS.rule);
          doc.line(MARGIN, y + 4, pageW - MARGIN, y + 4);
          y += 14;
          break;
      }
    }
  });

  // bookmarks + footer page numbers
  const total = doc.getNumberOfPages();
  for (const e of tocEntries) (doc as any).outline?.add(null, clean(e.title), { pageNumber: e.page });
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(COLORS.muted);
    doc.text(`Readi Documentation  |  Page ${p} of ${total}`, pageW / 2, pageH - 22, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
