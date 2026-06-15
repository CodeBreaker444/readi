import { prisma } from '@/lib/prisma';

export interface ProcedureDocument {
    doc_key: string;
    section_title: string;
    section_number: string | null;
    source_file: string;
    html_content: string;
    created_at: Date | null;
}

export async function getDocumentByKey(docKey: string): Promise<ProcedureDocument | null> {
    const doc = await prisma.procedure_document.findUnique({
        where: { doc_key: docKey },
        select: {
            doc_key: true,
            section_title: true,
            section_number: true,
            source_file: true,
            html_content: true,
            created_at: true,
        },
    });

    return doc;
}
