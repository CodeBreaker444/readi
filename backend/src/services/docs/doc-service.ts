import { supabase } from '../../database/database';

export interface ProcedureDocument {
    doc_key: string;
    section_title: string;
    section_number: string;
    source_file: string;
    html_content: string;
    created_at: string;
}

export async function getDocumentByKey(docKey: string): Promise<ProcedureDocument | null> {
    const { data, error } = await supabase
        .from('procedure_document')
        .select('doc_key, section_title, section_number, source_file, html_content, created_at')
        .eq('doc_key', docKey)
        .single();

    if (error || !data) return null;
    return data as ProcedureDocument;
}
