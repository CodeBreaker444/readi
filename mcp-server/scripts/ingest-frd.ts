import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { embedBatch } from "../lib/embeddings/generate";
import { upsertChunks } from "../lib/vectorstore/supabase";

// Load .env manually if needed
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

async function main() {
    console.log("Starting Maintenance FRD ingestion...");
    // The file is located in the parent directory of mcp-next
    const filePath = resolve(process.cwd(), "../new-details-english.txt");
    
    if (!existsSync(filePath)) {
        console.error("Error: new-details.txt not found at " + filePath);
        process.exit(1);
    }

    const rawContent = readFileSync(filePath, "utf8");

    // We'll split the content into sections based on <h1> and <h2> tags for better granularity
    // We remove the tags themselves to keep only high-quality data
    const sections = rawContent.split(/<(?:h1|h2)>/i)
        .filter(Boolean)
        .map(s => s.split(/<\/(?:h1|h2)>/i)[0] + "\n" + s.split(/<\/(?:h1|h2)>/i)[1])
        .filter(s => s.length > 50); // Filter out very short artifacts

    console.log(`Found ${sections.length} major sections to index.`);

    const chunks = sections.map((text, i) => {
        // Cleaning up the HTML tags just slightly to make it readable for the LLM
        const cleanText = text
            .replace(/<p>/g, "")
            .replace(/<\/p>/g, "\n")
            .replace(/<table>/g, "\n[Table Start]\n")
            .replace(/<\/table>/g, "\n[Table End]\n")
            .replace(/<tr>/g, "| ")
            .replace(/<\/tr>/g, "\n")
            .replace(/<td>/g, "")
            .replace(/<\/td>/g, " | ")
            .replace(/<ul>/g, "\n")
            .replace(/<\/ul>/g, "")
            .replace(/<li>/g, "- ")
            .replace(/<\/li>/g, "\n")
            .replace(/<strong>/g, "")
            .replace(/<\/strong>/g, "")
            .trim();

        const id = `mnt_frd_${i}`;

        return {
            id,
            text: cleanText,
            vector: [] as number[],
            meta: {
                kind: "procedural",
                table: "frd_maintenance",
                source: "new-details.docx"
            }
        };
    });

    console.log("Generating embeddings for " + chunks.length + " chunks...");
    const vectors = await embedBatch(chunks.map(c => c.text));

    const finalChunks = chunks.map((c, i) => ({
        ...c,
        vector: vectors[i]
    }));

    console.log("Upserting to Supabase...");
    await upsertChunks(finalChunks);

    console.log("Done! Maintenance Management FRD is now indexed and searchable by the agent.");
}

main().catch(console.error);
