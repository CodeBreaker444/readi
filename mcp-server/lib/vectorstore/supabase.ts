import { getSupabase } from "../supabase";


export async function upsertChunks(chunks: Array<{ id: string; vector: number[]; text: string; meta: { table?: string; column?: string; kind?: string }; }>) {
    const { error } = await getSupabase().from("schema_chunks").upsert(
        chunks.map(c => ({
            id: c.id,
            content: c.text,
            embedding: c.vector,
            table_name: c.meta.table ?? null,
            column_name: c.meta.column ?? null,
            kind: c.meta.kind ?? null,
        })),
        {
            onConflict: "id"
        }
    );
    if (error)
        throw error;
}

export async function searchSimilar(queryVector: number[], topK = 5) {
    const { data, error } = await getSupabase().rpc("match_schema_chunks", {
        query_embedding: queryVector,
        match_count: topK,
    });
    if (error)
        throw error;
    return (data ?? []).map((r: any) => ({
        text: r.content,
        score: r.similarity,
        meta: {
            table: r.table_name,
            column: r.column_name,
            kind: r.kind
        },
    }));
}
