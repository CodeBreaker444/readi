import { readFileSync, writeFileSync, existsSync } from "fs";
import Groq from "groq-sdk";
import { resolve } from "path";

// Load .env manually if needed
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function translate() {
    const rawFilePath = resolve(process.cwd(), "../new-details.txt");
    const outputFilePath = resolve(process.cwd(), "../new-details-english.txt");

    if (!existsSync(rawFilePath)) {
        console.error("Error: new-details.txt not found at " + rawFilePath);
        process.exit(1);
    }

    const text = readFileSync(rawFilePath, "utf8");

    const prompt = `You are a professional technical translator specializing in drone maintenance and operational procedures.
The following document is a Maintenance Management FRD. Parts of it are in English, while some specific forms and tables are in Italian.
Translate the Italian parts into professional English. If parts are already in English, keep them as is.
Ensure terms like "REGISTRAZIONE E ATTESTAZIONE DELLE ATTIVITA DI MANUTENZIONE" are correctly translated as "Maintenance Activity Registration and Attestation".
Preserve all HTML structure (h1, h2, table, tr, td, p etc.) precisely as they are. Do NOT change the formatting or tags. Just translate the text content within the tags.

DOCUMENT CONTENT:
${text}`;

    console.log("Translating Maintenance FRD to English...");
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
    });

    const translatedText = response.choices[0]?.message?.content || "";
    // Sometimes the LLM includes markdown code blocks in the response, we want just the text.
    const cleanText = translatedText.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "");
    
    writeFileSync(outputFilePath, cleanText);
    console.log("Translation complete! Saved to new-details-english.txt");
}

translate().catch(console.error);
