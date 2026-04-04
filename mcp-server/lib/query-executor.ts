import { getSupabase } from "./supabase";
import { BLOCKED_COLUMNS } from "./constants";
import { QueryPlan } from "./types";


export async function executeQueryPlan(plan: QueryPlan, userId: number, ownerID: number, role: string): Promise<any[]> {

    const supabase = getSupabase();

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

    const tablesWithOwner = [
        "pilot_mission", "planning", "planning_logbook", "safety_report",
        "spi_kpi", "spi_kpi_definition", "spi_kpi_log", "audit", "audit_finding",
        "tool", "maintenance_ticket", "training", "client",
        "compliance_requirement", "compliance_status_log", "checklist",
        "luc_document", "calendar_shift", "users", "notification",
        "compliance_evidence", "repository_file",
    ];

    if (tablesWithOwner.includes(plan.table))
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

    if (!plan.aggregation || plan.aggregation === "LIST") {
        q = q.limit(20);
    }

    const { data, error, count } = await q;

    if (error)
        throw error;

    if (plan.aggregation === "COUNT") {
        return [{ count: count ?? (data?.length ?? 0) }];
    }

    if (data && Array.isArray(data)) {
        return data.map((row: any) => {
            const clean: any = {};
            for (const [key, val] of Object.entries(row)) {
                if (!BLOCKED_COLUMNS.includes(key)) {
                    clean[key] = val;
                }
            }
            return clean;
        });
    }

    return data ?? [];
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
