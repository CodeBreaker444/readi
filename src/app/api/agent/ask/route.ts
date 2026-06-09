import { internalError } from "@/lib/api-error";
import { getUserSession } from "@/lib/auth/server-session";
import { E } from "@/lib/error-codes";
import { checkTokenLimits, recordTokenUsage } from "@/lib/token-tracker";
import { ROLE_ALLOWED_TABLES } from "@mcp-server/lib/constants";
import { getGroq } from "@mcp-server/lib/groq";
import { executeQueryPlan } from "@mcp-server/lib/query-executor";
import { TABLE_CATALOG } from "@mcp-server/lib/schema-catalog";
import { ROLE_QUERY_RULES, TABLE_SCHEMA } from "@mcp-server/lib/schema-details";
import { webSearch } from "@mcp-server/lib/serp";
import { getSupabase } from "@mcp-server/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { GROQ_MODEL } from "../../../../lib/token-limits";

export const dynamic = "force-dynamic";

const RESTRICTED_ROLES = ['SUPERADMIN'];

/** Accumulates token usage across multiple Groq calls within one request. */
class TokenAccumulator {
    input = 0;
    output = 0;

    add(usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined) {
        if (!usage) return;
        this.input += usage.prompt_tokens ?? 0;
        this.output += usage.completion_tokens ?? 0;
    }

    get total() { return this.input + this.output; }
}

async function handleDecommissioned(ownerID: number) {
    try {
        const supabase = getSupabase();
        const today = new Date().toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from('tool_component')
            .select(`
                component_id,
                component_name,
                component_type,
                serial_number,
                expiration_date,
                component_active,
                tool:tool!fk_tool_id (
                    tool_id,
                    tool_name,
                    tool_code,
                    fk_owner_id
                )
            `)
            .lte('expiration_date', today)
            .not('expiration_date', 'is', null);

        if (error) {
            console.error("Decommissioned query error:", error);
            return null;
        }

        const ownerFiltered = (data || []).filter((c: any) => c.tool?.fk_owner_id === ownerID);
        if (ownerFiltered.length === 0) return null;

        return ownerFiltered;
    } catch (e) {
        console.error("Decommissioned handler error:", e);
        return null;
    }
}

async function handleClassifier(groq: any, question: string, acc: TokenAccumulator) {
    const classifierPrompt = `Classify this question into one or more intents: [DATABASE, PROCEDURE, WEB_SEARCH, DECOMMISSIONED, OTHER].
                                - DATABASE: Facts from a database (missions, tool IDs, alerts, tickets).
                                - PROCEDURE: Rules, regulations, manuals, checklists, or "audit/compliance" questions.
                                - WEB_SEARCH: External knowledge, industry news, regulations not in our database (e.g. EASA, FAA, drone laws).
                                - DECOMMISSIONED: Questions about expired, decommissioned, non-operational, or out-of-service components and systems.
                                - OTHER: Greeting/General.

                                Rule: If the question asks about "compliance", "audit", "violation", "safe to fly", or "alerts", you MUST include BOTH [DATABASE, PROCEDURE].
                                Rule: If the question asks about external regulations, news, or industry standards, include [WEB_SEARCH].
                                Rule: If the question asks about "decommissioned", "expired components", "non-operational", "out of service", "which systems are down", or "component expiry", you MUST include [DECOMMISSIONED].

                                Question: "${question}"
                                Output ONLY as a JSON array.`;

    const res = await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 30,
        messages: [{ role: "user", content: classifierPrompt }],
    });

    acc.add(res.usage);

    const content = res.choices?.[0]?.message?.content || "[]";
    try {
        const matches = content.match(/\[.*\]/);
        return JSON.parse(matches ? matches[0] : "[]");
    } catch {
        return ["DATABASE"];
    }
}

async function handleDatabase(
    groq: any,
    question: string,
    user: { role: string; userId: number; ownerID: number },
    acc: TokenAccumulator,
) {
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
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 60,
        messages: [{ role: "user", content: tablePickerPrompt }],
    });

    acc.add(pickerRes.usage);

    const tablesString = (pickerRes.choices?.[0]?.message?.content ?? "").replace(/['"`]/g, "").trim();
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
                            - Use aggregation "COUNT" when the question asks "how many", "count", or a number of records.
                            - Use aggregation "LIST" when the question asks to show, list, or detail records.
                            - Set date_filter to null for all-time questions (e.g. "total", "ever", "all", "completed").
                            - Set date_filter.range to "today" for "today" questions.
                            - Set date_filter.range to "this_week" for "recent" or "this week" questions.
                            - Set date_filter.range to "this_month" for "this month" questions.
                            - Set date_filter.range to "this_year" for "this year" or "annual" questions.
                            - Set date_filter.range to "last_month" for "last month" questions.
                            - Set extra_filter to null unless the question asks for a specific status, type, or severity.
                            - MANDATORY: Always set "extra_filter" to null for compliance audits.
                            - For "last", "most recent", "latest" questions: set order_by to the primary date column desc and row_limit to 1.
                            - For "first" questions: set order_by to the primary date column asc and row_limit to 1.
                            - For list/show questions without "last"/"first": leave order_by null and row_limit null (default 15 applies).

                            Output format (replace placeholders with actual values):
                            {"table":"${table}","select_columns":["*"],"aggregation":"<COUNT or LIST>","date_filter":<null or {"column":"<col>","range":"<today|this_week|this_month|this_year|last_month>"}>,"extra_filter":<null or {"column":"<col>","value":"<val}">>,"order_by":<null or {"column":"<col>","direction":"<asc|desc}">>,"row_limit":<null or number>}

                            Question: "${question}"
                            Output ONLY valid JSON.`;

        const planRes = await groq.chat.completions.create({
            model: GROQ_MODEL,
            temperature: 0,
            max_tokens: 300,
            messages: [{ role: "user", content: planPrompt }],
        });

        acc.add(planRes.usage);

        const cleanPlan = (planRes.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
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

async function handleProcedure(question: string) {
    try {
        const supabase = getSupabase();

        const { data: embeddingRes, error: embeddingError } = await supabase.functions.invoke('get-embedding', {
            body: { text: question }
        });

        if (embeddingError || !embeddingRes?.embedding) {
            console.error("Embedding error:", embeddingError);
            return "No specific company procedures found for this topic.";
        }

        const { data: matches, error: matchError } = await supabase.rpc('match_documents', {
            query_embedding: embeddingRes.embedding,
            match_threshold: 0.5,
            match_count: 5
        });

        if (matchError) {
            console.error("Match documents error:", matchError);
            return "No specific company procedures found for this topic.";
        }

        if (!matches || matches.length === 0) return "No specific company procedures found for this topic.";

        return matches.map((m: any) => m.content).join("\n\n---\n\n");
    } catch (e) {
        console.error("Procedure lookup error:", e);
        return "No specific company procedures found for this topic.";
    }
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

        if (RESTRICTED_ROLES.includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { question } = await req.json();

        if (!question?.trim()) {
            return NextResponse.json({ error: "question required" }, { status: 400 });
        }

        let user = {
            role: session.user.role,
            userId: session.user.userId,
            ownerID: session.user.ownerId,
        };

        // ADMIN must impersonate an OPM user to use the chat agent
        if (session.user.role === 'ADMIN') {
            const impersonateEmail = req.headers.get('x-opm-impersonate');
            if (!impersonateEmail) {
                return NextResponse.json({ error: "Select an OPM user to chat as." }, { status: 400 });
            }

            const supabase = getSupabase();
            const { data: opmUser, error: opmError } = await supabase
                .from('users')
                .select('user_id, fk_owner_id, user_role')
                .eq('email', impersonateEmail)
                .eq('fk_owner_id', session.user.ownerId)
                .eq('user_role', 'OPM')
                .eq('user_active', 'Y')
                .single();

            if (opmError || !opmUser) {
                return NextResponse.json({ error: "OPM user not found or inactive." }, { status: 403 });
            }

            user = {
                role: opmUser.user_role,
                userId: opmUser.user_id,
                ownerID: opmUser.fk_owner_id,
            };
        }

        // Enforce token limits before running any expensive AI calls
        const limitCheck = await checkTokenLimits(user.userId);
        if (!limitCheck.allowed) {
            return NextResponse.json({ error: limitCheck.reason }, { status: 429 });
        }

        const groq = getGroq();
        const acc = new TokenAccumulator();

        const intents = await handleClassifier(groq, question, acc);

        let dbResult: any = null;
        let procResult: any = null;
        let webResult: any = null;
        let decommissionedResult: any = null;

        if (intents.includes("DATABASE")) {
            dbResult = await handleDatabase(groq, question, user, acc);
        }

        if (intents.includes("PROCEDURE")) {
            procResult = await handleProcedure(question);
        }

        if (intents.includes("WEB_SEARCH")) {
            webResult = await handleWebSearch(question);
        }

        if (intents.includes("DECOMMISSIONED")) {
            decommissionedResult = await handleDecommissioned(user.ownerID);
        }

        // Cap data fed to synthesizer to stay within Groq's 12k TPM limit
        const MAX_DATA_CHARS = 8_000;
        const rawData = dbResult?.data || "No data found.";
        const cappedData = typeof rawData === "string" && rawData.length > MAX_DATA_CHARS
            ? rawData.slice(0, MAX_DATA_CHARS) + "\n... [data truncated for length]"
            : rawData;

        const decommissionedSection = decommissionedResult
            ? `DECOMMISSIONED / EXPIRED COMPONENTS:\n${JSON.stringify(decommissionedResult, null, 2)}`
            : "No decommissioned component data.";

        const synthesizerPrompt = `You are the READI Compliance Auditor. Be CONCISE and DIRECT.

                                    USER ROLE: ${user.role}
                                    QUESTION: "${question}"

                                    PLATFORM DATA (EVIDENCE):
                                    ${cappedData}

                                    COMPANY PROCEDURES (THE LAW):
                                    ${procResult || "No specific rules found."}

                                    WEB SEARCH RESULTS:
                                    ${webResult || "No web search performed."}

                                    ${decommissionedSection}

                                    AUDIT RULES:
                                    1. If a mission flew while an alert was active (compare timestamps), flag it.
                                    2. If max_altitude > 120m, flag it.
                                    3. If a drone has an open high-priority maintenance ticket, flag it.
                                    4. Quote specific mission IDs (e.g. MISSION-WIND-AUDIT).

                                    DECOMMISSIONED RULES:
                                    1. A component is decommissioned when its expiration_date is on or before today's date.
                                    2. When a component is decommissioned, its parent system (tool) is considered NON-OPERATIONAL.
                                    3. If decommissioned component data is present, list EACH decommissioned component as a separate line with: component name, component type, serial number (if available), expiration date, and the system (tool name / tool code) it belongs to.
                                    4. Group by system: list all expired components under their respective system.
                                    5. If NO decommissioned data is present, state "No decommissioned systems or components found."

                                    RESPONSE RULES:
                                    - NEVER start with "To answer your question" or "I have reviewed". Jump straight to the answer.
                                    - For violations: Start with "VIOLATION:" then the finding.
                                    - For non-violations: Just state the answer. Do NOT append "All clear" or any sign-off.
                                    - For data queries: Give the answer directly (e.g. "You completed 8 missions.").
                                    - For decommissioned queries: List every expired component grouped by system. Do not summarize — list each one.
                                    - Keep answers under 3 sentences unless listing multiple violations or decommissioned items.
                                    - Do NOT use emojis.
                                    - Do NOT explain your reasoning process.`;

        const finalRes = await groq.chat.completions.create({
            model: GROQ_MODEL,
            temperature: 0,
            max_tokens: 700,
            messages: [{ role: "user", content: synthesizerPrompt }],
        });

        acc.add(finalRes.usage);

        // Record total token usage for this request (fire-and-forget)
        recordTokenUsage({
            user_id: user.userId,
            owner_id: user.ownerID,
            input_tokens: acc.input,
            output_tokens: acc.output,
            total_tokens: acc.total,
            model: GROQ_MODEL,
        }).catch((e) => console.error("Token record error:", e));

        return NextResponse.json({
            answer: finalRes.choices?.[0]?.message?.content ?? "No response generated.",
            debug: {
                intents,
                role: user.role,
                userId: user.userId,
                tokens: { input: acc.input, output: acc.output, total: acc.total },
                dbDebug: dbResult?.debug,
                hasProcedure: !!procResult,
                hasWebSearch: !!webResult,
                decommissionedCount: decommissionedResult?.length ?? 0,
            }
        });

    } catch (error: any) {
        console.error("Agent Error:", error);
      return internalError(E.SV001, error);
    }
}