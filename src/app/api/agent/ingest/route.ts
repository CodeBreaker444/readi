import { forbidden } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { embedBatch } from '@mcp-server/lib/embeddings/generate';
import { prisma } from '@/lib/prisma';
import { upsertChunks } from '@mcp-server/lib/vectorstore/supabase';
import { NextRequest, NextResponse } from 'next/server';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_FILES = 10;

function adminOnly(role: string) {
    return role === 'ADMIN';
}

/** GET /api/agent/ingest — list all ingested documents (admin only) */
export async function GET() {
    const { session, error } = await requireAuth();
    if (error) return error;
    if (!adminOnly(session!.user.role)) return forbidden(E.PX001);

    try {
        const data = await prisma.procedure_document.findMany({
            select: { doc_key: true, section_title: true, source_file: true, created_at: true },
            orderBy: { created_at: 'desc' },
        });

        const fileMap: Record<string, { count: number; created_at: string | null }> = {};
        for (const doc of data) {
            if (!fileMap[doc.source_file]) {
                fileMap[doc.source_file] = { count: 0, created_at: doc.created_at?.toISOString() ?? null };
            }
            fileMap[doc.source_file].count += 1;
        }

        return NextResponse.json({
            documents: data,
            fileSummary: fileMap,
            totalFiles: Object.keys(fileMap).length,
            limitReached: Object.keys(fileMap).length >= MAX_PDF_FILES,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
}

export async function POST(req: NextRequest) {
    const { session, error } = await requireAuth();
    if (error) return error;
    if (!adminOnly(session!.user.role)) return forbidden(E.PX001);

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

        // Hard limit 1: 10 MB per PDF
        if (isPdf && file.size > MAX_PDF_SIZE_BYTES) {
            return NextResponse.json(
                { error: `PDF exceeds the 10 MB size limit (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB).` },
                { status: 413 }
            );
        }

        // Hard limit 2: max 10 unique PDF files in the knowledge base
        if (isPdf) {
            const existing = await prisma.procedure_document.findMany({
                select: { source_file: true },
                orderBy: { created_at: 'asc' },
            });

            const uniqueFiles = new Set(existing.map((d) => d.source_file));

            if (!uniqueFiles.has(file.name) && uniqueFiles.size >= MAX_PDF_FILES) {
                return NextResponse.json(
                    { error: `Knowledge base limit reached. Maximum ${MAX_PDF_FILES} PDF files allowed. Delete an existing file first.` },
                    { status: 429 }
                );
            }
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let textContent = '';

        if (isPdf) {
            try {
                textContent = await extractPdfText(buffer);
            } catch (pdfErr: any) {
                return NextResponse.json({ error: `PDF parsing failed: ${pdfErr.message}` }, { status: 500 });
            }
        } else {
            textContent = new TextDecoder().decode(buffer);
        }

        const chunks = textContent.split(/\n\s*\n/).filter((c) => c.trim().length > 50);
        if (chunks.length === 0) {
            return NextResponse.json({ error: 'No readable content found in file' }, { status: 400 });
        }

        const batchId = Date.now().toString();
        const sourceFile = file.name;

        // Store text chunks in procedure_document
        const procedureDocs = chunks.map((chunk, i) => {
            const sectionTitle = chunk.split('\n')[0].slice(0, 100).trim() || `Section ${i + 1}`;
            return {
                doc_key: `dyn_${batchId}_${i}`,
                source_file: sourceFile,
                section_title: sectionTitle,
                section_number: `${i + 1}`,
                html_content: `<article><h1>${sectionTitle}</h1><p>${chunk.replace(/\n/g, '<br/>')}</p></article>`,
                plain_text: chunk,
            };
        });

        await prisma.$transaction(
            procedureDocs.map((doc) =>
                prisma.procedure_document.upsert({
                    where: { doc_key: doc.doc_key },
                    create: doc,
                    update: {
                        section_title: doc.section_title,
                        section_number: doc.section_number,
                        html_content: doc.html_content,
                        plain_text: doc.plain_text,
                        source_file: doc.source_file,
                    },
                })
            )
        );

        // Generate and store vector embeddings
        console.log(`[ingest] Generating embeddings for ${chunks.length} chunks…`);
        const vectors = await embedBatch(chunks);

        await upsertChunks(
            chunks.map((chunk, i) => ({
                id: `dyn_chunk_${batchId}_${i}`,
                text: chunk,
                vector: vectors[i],
                meta: { table: 'dynamic_knowledge', kind: 'procedural' },
            }))
        );

        return NextResponse.json({ success: true, sections: chunks.length });
    } catch (err: any) {
        console.error('[ingest] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/** DELETE /api/agent/ingest?source=<filename> — remove a document and its vectors (admin only) */
export async function DELETE(req: NextRequest) {
    const { session, error } = await requireAuth();
    if (error) return error;
    if (!adminOnly(session!.user.role)) return forbidden(E.PX001);

    try {
        const source = req.nextUrl.searchParams.get('source');
        if (!source) return NextResponse.json({ error: 'source query param required' }, { status: 400 });

        const docsToDelete = await prisma.procedure_document.findMany({
            where: { source_file: source },
            select: { doc_key: true },
        });

        await prisma.procedure_document.deleteMany({ where: { source_file: source } });

        if (docsToDelete.length > 0) {
            const chunkIds = docsToDelete.map((d) => d.doc_key.replace(/^dyn_/, 'dyn_chunk_'));
            await prisma.schema_chunks.deleteMany({ where: { id: { in: chunkIds } } });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
