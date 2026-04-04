import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/server-session";
import { getGroq } from "@mcp-server/lib/groq";
import { ROLE_ALLOWED_TABLES } from "@mcp-server/lib/constants";
import { TABLE_CATALOG } from "@mcp-server/lib/schema-catalog";
import { TABLE_SCHEMA, ROLE_QUERY_RULES } from "@mcp-server/lib/schema-details";
import { executeQueryPlan } from "@mcp-server/lib/query-executor";
import { getSupabase } from "@mcp-server/lib/supabase";
import { webSearch } from "@mcp-server/lib/serp";

export const dynamic = "force-dynamic";

async function handleClassifier(groq: any, question: string) {
    const classifierPrompt = `Classify this question into one or more intents: [DATABASE, PROCEDURE, WEB_SEARCH, OTHER].
                                - DATABASE: Facts from a database (missions, tool IDs, alerts, tickets).
                                - PROCEDURE: Rules, regulations, manuals, checklists, or "audit/compliance" questions.
                                - WEB_SEARCH: External knowledge, industry news, regulations not in our database (e.g. EASA, FAA, drone laws).
                                - OTHER: Greeting/General.

                                Rule: If the question asks about "compliance", "audit", "violation", "safe to fly", or "alerts", you MUST include BOTH [DATABASE, PROCEDURE].
                                Rule: If the question asks about external regulations, news, or industry standards, include [WEB_SEARCH].

                                Question: "${question}"
                                Output ONLY as a JSON array.`;

    const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 30,
        messages: [{ role: "user", content: classifierPrompt }],
    });

    const content = res.choices[0].message.content || "[]";
    try {
        const matches = content.match(/\[.*\]/);
        return JSON.parse(matches ? matches[0] : "[]");
    } catch {
        return ["DATABASE"];
    }
}

async function handleDatabase(groq: any, question: string, user: { role: string; userId: number; ownerID: number }) {
    const allowed = ROLE_ALLOWED_TABLES[user.role] ?? [];
    if (allowed.length === 0) return { data: null, error: "no_access" };

    const catalogLines = allowed
        .filter((t: string) => TABLE_CATALOG[t])
        .map((t: string) => `- ${t}: ${TABLE_CATALOG[t]}`)
        .join("\n");

    const tablePickerPrompt = `Pick ONE or TWO most relevant tables from the list:
                                ${catalogLines}

                                Rules:
                                - For "wind", "weather", or "safety alert" questions: you MUST pick BOTH "pilot_mission" and "alert_log".
                                - For "compliance" or "audit": pick BOTH "pilot_mission" and another relevant table (e.g. tool, alert_log).
                                - Use "alert_log" for any system warning/weather alert.

                                Question: "${question}"
                                Output ONLY as a comma-separated list of table names. Nothing else.`;

    const pickerRes = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 30,
        messages: [{ role: "user", content: tablePickerPrompt }],
    });

    const tablesString = (pickerRes.choices[0].message.content ?? "").replace(/['"`]/g, "").trim();
    const selectedTables = tablesString.split(",").map((t: string) => t.trim()).filter((t: string) => t !== "");

    let combinedData = "";
    const debugPlans: any[] = [];

    for (const table of selectedTables) {
        if (!TABLE_CATALOG[table]) continue;
        if (!allowed.includes(table)) continue;

        const tableSchema = TABLE_SCHEMA[table];
        if (!tableSchema) continue;

        const roleRules = ROLE_QUERY_RULES[user.role] ?? "";
        const userIdNote = roleRules.includes("<USER_ID>")
            ? roleRules.replace("<USER_ID>", String(user.userId))
            : roleRules;

        const planPrompt = `You are a query planner. Output ONLY a JSON query plan for "${table}".
                            TABLE: ${table}
                            ${tableSchema}
                            ${userIdNote ? `Role Access Rules: ${userIdNote}\n` : ""}

                            Planning Rules:
                            - MANDATORY: Always set "extra_filter" to null for compliance audits.
                            - For compliance/audit: set aggregation: "LIST".
                            - For "recent": set date_filter.range to "this_week".

                            Output format: {"table":"${table}","select_columns":["*"],"aggregation":"LIST","date_filter":{"column":"${table === 'pilot_mission' ? 'scheduled_start' : 'created_at'}","range":"this_week"},"extra_filter":null}

                            Question: "${question}"
                            Output ONLY valid JSON.`;

        const planRes = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            max_tokens: 300,
            messages: [{ role: "user", content: planPrompt }],
        });

        const cleanPlan = (planRes.choices[0].message.content ?? "").replace(/```json|```/g, "").trim();
        try {
            const plan = JSON.parse(cleanPlan);
            debugPlans.push(plan);
            const data = await executeQueryPlan(plan, user.userId, user.ownerID, user.role);
            console.log(`Table Result for ${table}:`, data?.length || 0, "rows found");
            combinedData += `\n--- START TABLE: ${table} ---\n${JSON.stringify(data, null, 2)}\n--- END TABLE: ${table} ---\n`;
        } catch (e) {
            console.error(`Query Plan Error for ${table}:`, e);
            continue;
        }
    }

    if (combinedData === "") return { data: null, error: "no_data_found" };

    return {
        data: combinedData,
        debug: { tables: selectedTables, plans: debugPlans }
    };
}

async function handleProcedure(groq: any, question: string) {
    const supabase = getSupabase();

    const { data: embeddingRes } = await supabase.functions.invoke('get-embedding', {
        body: { text: question }
    });

    const { data: matches } = await supabase.rpc('match_documents', {
        query_embedding: embeddingRes?.embedding || [],
        match_threshold: 0.5,
        match_count: 5
    });

    if (!matches || matches.length === 0) return "No specific company procedures found for this topic.";

    return matches.map((m: any) => m.content).join("\n\n---\n\n");
}

async function handleWebSearch(question: string) {
    try {
        const results = await webSearch(question);
        if (!results || results.length === 0) return null;
        return results.map((r: any) => `• ${r.title}\n  ${r.snippet}\n  Source: ${r.link}`).join("\n\n");
    } catch (e) {
        console.error("Web search error:", e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getUserSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restrictedRoles = ['SUPERADMIN', 'ADMIN'];
        if (restrictedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { question } = await req.json();

        if (!question?.trim()) {
            return NextResponse.json({ error: "question required" }, { status: 400 });
        }

        const user = {
            role: session.user.role,
            userId: session.user.userId,
            ownerID: session.user.ownerId,
        };

        const groq = getGroq();

        const intents = await handleClassifier(groq, question);

        let dbResult: any = null;
        let procResult: any = null;
        let webResult: any = null;

        if (intents.includes("DATABASE")) {
            dbResult = await handleDatabase(groq, question, user);
        }

        if (intents.includes("PROCEDURE")) {
            procResult = await handleProcedure(groq, question);
        }

        if (intents.includes("WEB_SEARCH")) {
            webResult = await handleWebSearch(question);
        }

        const synthesizerPrompt = `You are the READI Compliance Auditor. Be CONCISE and DIRECT.

                                    USER ROLE: ${user.role}
                                    QUESTION: "${question}"

                                    PLATFORM DATA (EVIDENCE):
                                    ${dbResult?.data || "No data found."}

                                    COMPANY PROCEDURES (THE LAW):
                                    ${procResult || "No specific rules found."}

                                    WEB SEARCH RESULTS:
                                    ${webResult || "No web search performed."}

                                    AUDIT RULES:
                                    1. If a mission flew while an alert was active (compare timestamps), flag it.
                                    2. If max_altitude > 120m, flag it.
                                    3. If a drone has an open high-priority maintenance ticket, flag it.
                                    4. Quote specific mission IDs (e.g. MISSION-WIND-AUDIT).

                                    RESPONSE RULES:
                                    - NEVER start with "To answer your question" or "I have reviewed". Jump straight to the answer.
                                    - For violations: Start with "VIOLATION:" then the finding.
                                    - For non-violations: Just state the answer. Do NOT append "All clear" or any sign-off.
                                    - For data queries: Give the answer directly (e.g. "You completed 8 missions.").
                                    - Keep answers under 3 sentences unless listing multiple violations.
                                    - Do NOT use emojis.
                                    - Do NOT explain your reasoning process.`;

        const finalRes = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            max_tokens: 300,
            messages: [{ role: "user", content: synthesizerPrompt }],
        });

        return NextResponse.json({
            answer: finalRes.choices[0].message.content,
            debug: {
                intents,
                role: user.role,
                userId: user.userId,
                dbDebug: dbResult?.debug,
                hasProcedure: !!procResult,
                hasWebSearch: !!webResult
            }
        });

    } catch (error: any) {
        console.error("Agent Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
