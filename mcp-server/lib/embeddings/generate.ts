import { getGemini } from "../gemini";

async function geminiEmbed(text: string): Promise<number[]> {
    const genAI = getGemini();

    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
        content: { parts: [{ text }], role: "user" },
        outputDimensionality: 768,
    } as any);
    return result.embedding.values;
}

export async function embedText(text: string): Promise<number[]> {
    return geminiEmbed(text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
        results.push(await geminiEmbed(text));
        await new Promise(r => setTimeout(r, 100));
    }
    return results;
}
