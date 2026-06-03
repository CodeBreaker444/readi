import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

export interface HighlightCard {
  title: string;
  icon: string;
  color: string;
  description: string;
}

export interface ReleaseLog {
  version: string;
  date: string;
  title: string;
  description: string;
  status: string;       // latest | stable | deprecated
  releaseType: string;  // major | minor | patch
  tags: string[];
  highlightCards: HighlightCard[];
  body: string;
}

export function getReleaseLogs(): ReleaseLog[] {
  const folder = path.join(process.cwd(), 'releases');
  if (!fs.existsSync(folder)) return [];

  const files = fs.readdirSync(folder).filter((f) => f.endsWith('.md'));

  const logs = files.map((file) => {
    const raw = fs.readFileSync(path.join(folder, file), 'utf-8');
    const { data, content: body } = matter(raw);
    return {
      version:        String(data.version ?? ''),
      date:           String(data.date ?? ''),
      title:          String(data.title ?? ''),
      description:    String(data.description ?? ''),
      status:         String(data.status ?? 'stable'),
      releaseType:    String(data.releaseType ?? 'patch'),
      tags:           Array.isArray(data.tags) ? data.tags.map(String) : [],
      highlightCards: Array.isArray(data.highlightCards) ? data.highlightCards : [],
      body:           body.trim(),
    };
  });

  return logs.sort((a, b) => {
    const toNum = (v: string) =>
      v.replace(/^v/, '').split('.').map(Number).reduce((acc, n) => acc * 1000 + n, 0);
    return toNum(b.version) - toNum(a.version);
  });
}
