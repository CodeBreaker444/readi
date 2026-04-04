import { readFileSync } from "fs";
import { resolve } from "path";
import { embedBatch } from "../lib/embeddings/generate";
import { upsertChunks } from "../lib/vectorstore/supabase";

const envPath = resolve(process.cwd(), ".env");
if (readFileSync(envPath, "utf8")) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

async function main() {
    console.log("Starting manual ingestion...");
    const filePath = "powerpoint_translated_english.txt";
    const content = readFileSync(filePath, "utf8");

    const sections = content.split(/\*\*\d+\.\s+/).filter(Boolean);

    console.log(`Found ${sections.length} sections to index.`);

    const chunks = sections.map((text, i) => {
        const cleanText = text.trim();
        const id = `manual_${i}`;

        return {
            id,
            text: cleanText,
            vector: [] as number[],
            meta: {
                kind: "procedural",
                table: "manual"
            }
        };
    });

    console.log("Generating embeddings...");
    const vectors = await embedBatch(chunks.map(c => c.text));

    const finalChunks = chunks.map((c, i) => ({
        ...c,
        vector: vectors[i]
    }));

    console.log("Upserting to Supabase...");
    await upsertChunks(finalChunks);

    console.log("Done! Manual procedural knowledge is now indexed.");
}

main().catch(console.error);