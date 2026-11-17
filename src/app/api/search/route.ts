import { source } from '@/lib/docs/source';
import { createFromSource } from 'fumadocs-core/search/server';

const server = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

type Result = { type: string; url: string; content: string };

const baseUrl = (url: string) => url.split('#')[0];
const normalize = (s: string) => s.toLowerCase().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/**
 * Orama ranks hits purely by text relevance, so a page literally titled
 * "Slot Booking" can land below other pages that merely mention it. Move the
 * pages whose title matches the query to the top (exact title first, then
 * title contains query), keeping the original relevance order otherwise.
 */
export async function GET(request: Request) {
  const response = await server.GET(request);
  const query = normalize(new URL(request.url).searchParams.get('query') ?? '');
  if (!query || !response.ok) return response;

  const results = (await response.clone().json()) as Result[];
  if (!Array.isArray(results)) return response;

  const titleRank = new Map<string, number>();
  for (const r of results) {
    if (r.type !== 'page') continue;
    const title = normalize(r.content);
    const rank = title === query ? 0 : title.includes(query) ? 1 : 2;
    titleRank.set(baseUrl(r.url), rank);
  }

  const sorted = results
    .map((r, i) => ({ r, i, rank: titleRank.get(baseUrl(r.url)) ?? 2 }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.r);

  return Response.json(sorted);
}
