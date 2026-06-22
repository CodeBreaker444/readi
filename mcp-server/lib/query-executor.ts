import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";
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

    // Sanitize the LLM-generated plan before any DB interaction
    plan = sanitizeQueryPlan(plan);

    const safeCols = (plan.select_columns ?? []).filter((c: string) => !BLOCKED_COLUMNS.includes(c));

    // Build SELECT clause (using Prisma.raw for identifiers, safe after isValidColumn validation)
    let selectSql: Prisma.Sql;
    if (plan.aggregation === "COUNT") {
        selectSql = Prisma.raw("COUNT(*) as count");
    } else if (plan.aggregation === "SUM" && plan.aggregation_column) {
        selectSql = Prisma.raw(`SUM("${plan.aggregation_column}") as sum_value`);
    } else if (plan.aggregation === "AVG" && plan.aggregation_column) {
        selectSql = Prisma.raw(`AVG("${plan.aggregation_column}") as avg_value`);
    } else {
        const cols = safeCols.length > 0
            ? safeCols.map((c: string) => c === "*" ? "*" : `"${c}"`).join(", ")
            : "*";
        selectSql = Prisma.raw(cols);
    }

    // Build WHERE conditions
    const conditions: Prisma.Sql[] = [];

    if (TABLES_WITH_OWNER.includes(plan.table))
        conditions.push(Prisma.sql`"fk_owner_id" = ${ownerID}`);

    if (role === "PIC" && plan.table === "pilot_mission")
        conditions.push(Prisma.sql`"fk_pilot_user_id" = ${userId}`);

    if (plan.date_filter) {
        const { start, end } = dateRange(plan.date_filter.range);
        const col = Prisma.raw(`"${plan.date_filter.column}"`);
        conditions.push(Prisma.sql`${col} >= ${new Date(start)} AND ${col} <= ${new Date(end)}`);
    }

    if (plan.extra_filter) {
        let val = plan.extra_filter.value;
        if (typeof val === "string" && val.includes("=")) {
            const parts = val.split("=");
            val = parts[parts.length - 1].trim().replace(/['"]/g, "");
        }
        const col = Prisma.raw(`"${plan.extra_filter.column}"`);
        conditions.push(Prisma.sql`${col} = ${val}`);
    }

    const tableSql = Prisma.raw(`public."${plan.table}"`);
    const whereSql = conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;

    let orderSql: Prisma.Sql = Prisma.empty;
    if (plan.order_by && isValidColumn(plan.order_by.column)) {
        const col = Prisma.raw(`"${plan.order_by.column}"`);
        const dir = Prisma.raw(plan.order_by.direction === "asc" ? "ASC" : "DESC");
        orderSql = Prisma.sql`ORDER BY ${col} ${dir}`;
    }

    // COUNT queries need no row cap; LIST/SUM/AVG use the LLM-requested limit or default to 15
    let limitSql: Prisma.Sql = Prisma.empty;
    if (plan.aggregation !== "COUNT") {
        const cap = (plan.row_limit && plan.row_limit > 0 && plan.row_limit <= 50)
            ? plan.row_limit
            : 15;
        limitSql = Prisma.sql`LIMIT ${cap}`;
    }

    const rawData = await prisma.$queryRaw<any[]>(
        Prisma.sql`SELECT ${selectSql} FROM ${tableSql} ${whereSql} ${orderSql} ${limitSql}`
    );

    const debugInfo = {
        ownerID, userId, role,
        table: plan.table,
        count: rawData?.length || 0,
    };

    if (plan.aggregation === "COUNT") {
        const countVal = rawData?.[0]?.count;
        const count = typeof countVal === "bigint" ? Number(countVal) : (countVal ?? 0);
        return [{ count, _debug: debugInfo }];
    }

    if (plan.aggregation === "SUM") {
        const val = rawData?.[0]?.sum_value;
        return [{ sum: val != null ? Number(val) : 0, _debug: debugInfo }];
    }

    if (plan.aggregation === "AVG") {
        const val = rawData?.[0]?.avg_value;
        return [{ avg: val != null ? Number(val) : 0, _debug: debugInfo }];
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
        end: now.toISOString(),
    };
}
