import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Translate a chunk of Italian text to English ──
async function translateChunk(italianText: string): Promise<string> {
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 2000,
        messages: [{
            role: "user",
            content: `You are a professional technical translator specializing in drone operations and EU aviation regulations.
Translate the following Italian process flow text into clean, professional English.

CRITICAL RULES:
- Preserve ALL process codes exactly (GO.00, GO.01, GM.01, PR-TRN-01, PR-TLB, PR-MNT-DCK-01, GG.xx.xxx etc.)
- Preserve ALL folder paths exactly (LUC/__SITI/... etc.)
- Translate role names: "Pilota in Comando" → "Pilot in Command (PIC)", "Responsabile Manutenzione" → "Maintenance Manager", "Responsabile Operazioni" → "Operations Manager", "Responsabile Formazione" → "Training Manager", "Richiedente" → "Requester", "Centro Assistenza Fornitore" → "Vendor Service Center"
- Translate process terms accurately: "Manutenzione straordinaria" → "Extraordinary Maintenance", "Manutenzione ordinaria" → "Routine Maintenance", "Gestione Operazione" → "Operation Management", "Gestione Manutenzione" → "Maintenance Management", "Gestione Formazione" → "Training Management"
- Output ONLY the translated text, no commentary.

ITALIAN TEXT:
${italianText}`
        }]
    });
    return response.choices[0]?.message?.content || "";
}

// ── Define the process flow sections from the PDF ──
interface ProcessSection {
    pageNum: number;
    code: string;
    titleIt: string;
    key: string;
}

const SECTIONS: ProcessSection[] = [
    { pageNum: 3, code: "GO.00", titleIt: "Pianificazione missioni e comunicazione fine attività", key: "pflow_go00" },
    { pageNum: 4, code: "GO.01", titleIt: "Inserimento operazioni e avvio fasi pre-volo", key: "pflow_go01" },
    { pageNum: 5, code: "GO.02", titleIt: "Decollo, in volo, atterraggio e comunicazione fine missione", key: "pflow_go02" },
    { pageNum: 6, code: "GO.03", titleIt: "Post Volo, comunicazione fine operazione, gestione emergenze", key: "pflow_go03" },
    { pageNum: 7, code: "GM.01", titleIt: "Processo di manutenzione straordinaria", key: "pflow_gm01" },
    { pageNum: 8, code: "GM.02", titleIt: "Processo di manutenzione ordinaria", key: "pflow_gm02" },
    { pageNum: 9, code: "PR-TRN-01", titleIt: "Processo di gestione della formazione dei piloti UAS", key: "pflow_pr_trn01" },
    { pageNum: 10, code: "PR-TLB", titleIt: "Processo di gestione Technical Logbook", key: "pflow_pr_tlb" },
    { pageNum: 11, code: "PR-MNT-DCK-01", titleIt: "Processo di GESTIONE MANUTENZIONE E PROGRAMMA DI MANUTENZIONE – DJI DOCK 2 E UAS ASSOCIATO", key: "pflow_pr_mnt_dck01" },
];

function extractPageText(fullText: string, pageNum: number): string {
    const regex = new RegExp(`--- PAGE ${pageNum} ---\\n([\\s\\S]*?)(?=--- PAGE \\d+ ---|$)`);
    const match = fullText.match(regex);
    return match ? match[1].trim() : "";
}

function textToHtml(text: string, code: string): string {
    const lines = text.split("\n").filter(l => l.trim());
    let html = `<article>\n<h2>[${code}] Process Flow</h2>\n`;

    const blocks: string[] = [];
    let currentBlock = "";

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (/^[A-Z]{2}[\.\-]/.test(trimmed) && trimmed.length < 20) {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = `<code>${trimmed}</code>`;
        } else if (trimmed.startsWith("FOLDER") || trimmed.startsWith("LUC/")) {
            blocks.push(`<div class="folder-path"><strong>📁 </strong><code>${trimmed}</code></div>`);
            currentBlock = "";
        } else if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.includes(".")) {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = `<strong>${trimmed}</strong>`;
        } else {
            if (currentBlock) {
                currentBlock += ` — ${trimmed}`;
            } else {
                currentBlock = trimmed;
            }
        }
    }
    if (currentBlock) blocks.push(currentBlock);

    html += `<div class="process-steps">\n<ol>\n`;
    for (const block of blocks) {
        html += `<li>${block}</li>\n`;
    }
    html += `</ol>\n</div>\n</article>`;

    return html;
}

async function main() {
    console.log("=== Ingesting WhatsApp Process Flow Document ===\n");

    const extractedPath = resolve(process.cwd(), "../whatsapp_extracted.txt");
    if (!existsSync(extractedPath)) {
        console.error("Run extract-whatsapp-pdf.ts first!");
        return;
    }

    const fullText = readFileSync(extractedPath, "utf8");
    const allSections: Array<{
        doc_key: string;
        source_file: string;
        section_title: string;
        section_number: string;
        html_content: string;
        plain_text: string;
    }> = [];

    for (const section of SECTIONS) {
        const pageText = extractPageText(fullText, section.pageNum);
        if (!pageText || pageText.length < 20) {
            console.log(`⚠ Page ${section.pageNum} (${section.code}) — too short, skipping`);
            continue;
        }

        console.log(`\nTranslating [${section.code}] ${section.titleIt}...`);
        const translated = await translateChunk(pageText);
        console.log(`  ✓ Translated (${translated.length} chars)`);

        const html = textToHtml(translated, section.code);

        allSections.push({
            doc_key: section.key,
            source_file: "process-flow-manual.pdf",
            section_title: `[${section.code}] ${translated.split("\n")[0]?.substring(0, 80) || section.titleIt}`,
            section_number: section.code,
            html_content: html,
            plain_text: translated,
        });
    }

    if (allSections.length === 0) {
        console.log("No sections found. Exiting.");
        return;
    }

    const translatedFull = allSections
        .map(s => `=== ${s.section_number}: ${s.section_title} ===\n${s.plain_text}`)
        .join("\n\n---\n\n");
    writeFileSync(resolve(process.cwd(), "../whatsapp_translated_english.txt"), translatedFull);
    console.log(`\nSaved translated text to whatsapp_translated_english.txt`);

    console.log(`\nUpserting ${allSections.length} process flow sections to procedure_document...`);
    const { error } = await supabase
        .from("procedure_document")
        .upsert(allSections, { onConflict: "doc_key" });

    if (error) {
        console.error("Upsert Error:", error);
        return;
    }

    console.log("✅ Done! Process flow documents are now in the READI Agent.");
    for (const s of allSections) {
        console.log(`  /docs/${s.doc_key}  →  ${s.section_title}`);
    }
}

main().catch(console.error);
