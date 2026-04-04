import { readFileSync, writeFileSync } from "fs";
import Groq from "groq-sdk";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
if (readFileSync(envPath, "utf8")) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function translate() {
    const text = readFileSync("powerpoint_extracted.txt", "utf8");

    const prompt = `You are a professional technical translator specializing in drone operations and EU regulations.
Translate the following Italian operational procedure manual into clean, professional English.
Preserve process codes like GO.00, GM.01, PR-TLB etc.
Ensure terms like "Pilota in Comando" are translated as "Pilot in Command (PIC)" and "Responsabile Manutenzione" as "Maintenance Manager".
Format the output clearly as a translated document.

ITALIAN TEXT:
${text}`;

    console.log("Translating manual...");
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
    });

    const translatedText = response.choices[0]?.message?.content || "";
    writeFileSync("powerpoint_translated_english.txt", translatedText);
    console.log("Translation saved to powerpoint_translated_english.txt");
}

translate().catch(console.error);
