import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
    if (match)
        process.env[match[1]] = match[2];
}

async function main() {
    const { schemaToChunks } = await import("../lib/schema/definitions");
    const { embedBatch } = await import("../lib/embeddings/generate");
    const { upsertChunks } = await import("../lib/vectorstore/supabase");

    console.log("Ingesting schema...");

    const chunks = schemaToChunks();
    console.log("  " + chunks.length + " chunks");

    const vectors = await embedBatch(chunks.map(c => c.text));
    console.log("  " + vectors[0].length + "-dim embeddings done");

    await upsertChunks(chunks.map((c, i) => ({ ...c, vector: vectors[i] })));
    console.log("Done — " + chunks.length + " rows in Supabase");
}

main().catch(err => { console.error(err); process.exit(1); });