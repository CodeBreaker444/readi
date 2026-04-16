import { getSupabase } from "./supabase";
import { BLOCKED_COLUMNS, TABLES_WITH_OWNER } from "./constants";
import { QueryPlan } from "./types";

/**
 * Returns true if the value is a valid SQL column identifier.
 */
function isValidColumn(val: any): val is string {
    if (!val || typeof val !== "string") return false;
    if (val === "undefined" || val === "null" || val === "*") return false;
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(val.trim());
}

/**
 * Sanitizes LLM-generated query plans before execution.
 * Small models often output SQL expressions (count(*), count(col)) or "undefined"
 * as column names — this normalizes them into valid plans.
 */
function sanitizeQueryPlan(plan: QueryPlan): QueryPlan {
    const sanitized = { ...plan };

    const countExprRegex = /^count\s*\(/i;
    const sumExprRegex = /^sum\s*\(/i;
    const avgExprRegex = /^avg\s*\(/i;

    const rawCols = sanitized.select_columns ?? [];

    // If LLM put count(*) or count(col) directly in select_columns, convert to COUNT aggregation
    const hasCountExpr = rawCols.some((c: string) => countExprRegex.test(c));
    if (hasCountExpr && !sanitized.aggregation) {
        sanitized.aggregation = "COUNT";
    }

    // Strip all SQL expressions and invalid values from columns
    sanitized.select_columns = rawCols.filter((c: string) => {
        if (!c || c === "undefined" || c === "null") return false;
        if (countExprRegex.test(c) || sumExprRegex.test(c) || avgExprRegex.test(c)) return false;
        if (c !== "*" && !isValidColumn(c)) return false;
        return true;
    });

    // If columns became empty after sanitization, fall back to *
    if (sanitized.select_columns.length === 0) {
        sanitized.select_columns = ["*"];
    }

    // Ensure aggregation is a valid value
    const validAggregations = ["COUNT", "SUM", "AVG", "LIST", null];
    if (!validAggregations.includes(sanitized.aggregation)) {
        sanitized.aggregation = "LIST";
    }

    // If aggregation is SUM/AVG but no valid aggregation_column, fall back to LIST
    if ((sanitized.aggregation === "SUM" || sanitized.aggregation === "AVG") && !isValidColumn(sanitized.aggregation_column)) {
        sanitized.aggregation = "LIST";
    }

    // Validate date_filter — null it out if its column is invalid
    if (sanitized.date_filter) {
        if (!isValidColumn(sanitized.date_filter.column)) {
            sanitized.date_filter = null;
        }
    }

    // Validate extra_filter — null it out if its column is invalid
    if (sanitized.extra_filter) {
        if (!isValidColumn(sanitized.extra_filter.column)) {
            sanitized.extra_filter = null;
        }
    }

    return sanitized;
}

export async function executeQueryPlan(plan: QueryPlan, userId: number, ownerID: number, role: string): Promise<any[]> {

    const supabase = getSupabase();

    // Sanitize the LLM-generated plan before any DB interaction
    plan = sanitizeQueryPlan(plan);

    const safeCols = (plan.select_columns ?? []).filter((c: string) => !BLOCKED_COLUMNS.includes(c));

    let sel: string;
    if (plan.aggregation === "COUNT")
        sel = safeCols.length > 0 ? safeCols.join(",") : "*";
    else if (plan.aggregation === "SUM" && plan.aggregation_column)
        sel = `${plan.aggregation_column}.sum()`;
    else if (plan.aggregation === "AVG" && plan.aggregation_column)
        sel = `${plan.aggregation_column}.avg()`;
    else
        sel = safeCols.length > 0 ? safeCols.join(",") : "*";

    let q = supabase.from(plan.table).select(sel, {
        count: plan.aggregation === "COUNT" ? "exact" : undefined,
    });

    if (TABLES_WITH_OWNER.includes(plan.table))
        q = q.eq("fk_owner_id", ownerID);

    if (role === "PIC" && plan.table === "pilot_mission")
        q = q.eq("fk_pilot_user_id", userId);

    if (plan.date_filter) {
        const { start, end } = dateRange(plan.date_filter.range);
        q = q.gte(plan.date_filter.column, start).lte(plan.date_filter.column, end);
    }

    if (plan.extra_filter) {
        let val = plan.extra_filter.value;
        if (typeof val === 'string' && val.includes("=")) {
            const parts = val.split("=");
            val = parts[parts.length - 1].trim().replace(/['"]/g, "");
        }
        q = q.eq(plan.extra_filter.column, val);
    }

    // Removed strict limit to ensure accurate record counting for local models
    // q = q.limit(20);

    const { data: rawData, error, count } = await q;

    if (error) throw error;

    const debugInfo = {
        ownerID, userId, role,
        table: plan.table,
        count: rawData?.length || 0
    };

    if (plan.aggregation === "COUNT") {
        return [{ count: count ?? (rawData?.length ?? 0), _debug: debugInfo }];
    }

    return (rawData || []).map((row: any) => {
        const clean: any = { _debug: debugInfo };
        for (const [key, val] of Object.entries(row)) {
            if (!BLOCKED_COLUMNS.includes(key)) clean[key] = val;
        }
        return clean;
    });
}

function dateRange(range: string): { start: string; end: string } {
    const now = new Date();

    if (range === "today") {
        const today = now.toISOString().slice(0, 10);
        return { start: today, end: now.toISOString() };
    }

    if (range === "this_week") {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        return { start: monday.toISOString().slice(0, 10), end: now.toISOString() };
    }

    if (range === "this_month") {
        return {
            start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            end: now.toISOString(),
        };
    }

    if (range === "this_year") {
        return {
            start: new Date(now.getFullYear(), 0, 1).toISOString(),
            end: now.toISOString(),
        };
    }

    if (range === "last_month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lastMonth.toISOString(), end: endOfLastMonth.toISOString() };
    }

    return {
        start: new Date(0).toISOString(),
        end: now.toISOString()
    };
}
