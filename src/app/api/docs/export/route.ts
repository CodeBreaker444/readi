import { NextRequest, NextResponse } from 'next/server';
import { docsToPdf, getAllDocs, getDocBySlug } from '@/lib/docs/export';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/docs/export?scope=page&slug=modules/slot-booking&format=pdf
 * GET /api/docs/export?scope=all&format=pdf
 * Requires login (enforced by the middleware).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = sp.get('scope') ?? 'page';
  const format = sp.get('format') ?? 'pdf';

  const download = (body: Buffer | string, filename: string, type: string) =>
    new NextResponse(typeof body === 'string' ? body : new Uint8Array(body), {
      headers: {
        'Content-Type': type,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });

  try {
    if (scope === 'all') {
      const docs = await getAllDocs();
      if (format === 'pdf') {
        const pdf = await docsToPdf(docs, { title: 'Readi Platform Documentation', subtitle: 'Drone operations and compliance platform', cover: true });
        return download(pdf, 'readi-docs.pdf', 'application/pdf');
      }
      return NextResponse.json({ error: 'Unsupported format. Use pdf.' }, { status: 400 });
    }

    const slug = (sp.get('slug') ?? '').split('/').filter(Boolean);
    if (slug.some((s) => s === '..' || s.includes('\\'))) {
      return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
    }
    const doc = await getDocBySlug(slug);
    if (!doc) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });

    const base = doc.slugs.join('-') || 'introduction';
    if (format === 'pdf') {
      const pdf = await docsToPdf([doc], { title: doc.title });
      return download(pdf, `readi-${base}.pdf`, 'application/pdf');
    }
    return NextResponse.json({ error: 'Unsupported format. Use pdf.' }, { status: 400 });
  } catch (err) {
    console.error('[docs/export] failed', err);
    return NextResponse.json({ error: 'Failed to export documentation.' }, { status: 500 });
  }
}
