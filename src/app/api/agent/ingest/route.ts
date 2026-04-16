import { forbidden } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { embedBatch } from '@mcp-server/lib/embeddings/generate';
import { getSupabase } from '@mcp-server/lib/supabase';
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
        const supabase = getSupabase();
        const { data, error: dbError } = await supabase
            .from('procedure_document')
            .select('doc_key, section_title, source_file, created_at')
            .order('created_at', { ascending: false });

        if (dbError) throw dbError;

        const fileMap: Record<string, { count: number; created_at: string }> = {};
        for (const doc of data ?? []) {
            if (!fileMap[doc.source_file]) {
                fileMap[doc.source_file] = { count: 0, created_at: doc.created_at };
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
    if (typeof (globalThis as any).DOMMatrix === 'undefined') (globalThis as any).DOMMatrix = class {};
    if (typeof (globalThis as any).Path2D === 'undefined') (globalThis as any).Path2D = class {};
    if (typeof (globalThis as any).ImageData === 'undefined') (globalThis as any).ImageData = class {};

    const { PDFParse } = await import('pdf-parse');
    const path = await import('path');
    const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
    PDFParse.setWorker(workerPath);

    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
}

/** POST /api/agent/ingest — upload a new PDF or TXT file (admin only, hard limits enforced) */
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
            const supabase = getSupabase();
            const { data: existing } = await supabase
                .from('procedure_document')
                .select('source_file')
                .order('created_at', { ascending: true });

            const uniqueFiles = new Set((existing ?? []).map((d: any) => d.source_file));

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

        const supabase = getSupabase();
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

        const { error: procError } = await supabase.from('procedure_document').upsert(procedureDocs);
        if (procError) throw procError;

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

        const supabase = getSupabase();

        const { data: docsToDelete } = await supabase
            .from('procedure_document')
            .select('doc_key')
            .eq('source_file', source);

        const { error: procError } = await supabase
            .from('procedure_document')
            .delete()
            .eq('source_file', source);

        if (procError) throw procError;

        if (docsToDelete && docsToDelete.length > 0) {
            const chunkIds = docsToDelete.map((d: any) => d.doc_key.replace(/^dyn_/, 'dyn_chunk_'));
            await supabase.from('schema_chunks').delete().in('id', chunkIds);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
