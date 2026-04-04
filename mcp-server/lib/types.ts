// Shared interfaces and types for the READI Agent

export type Role = "PIC" | "OPM" | "SM" | "AM" | "CMM" | "MM" | "TM" | "DC" | "SLA";

export interface UserSession {
    userId: number;
    role: string;
    ownerID: number;
    name: string;
    email: string;
}

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export interface QueryPlan {
    table: string;
    select_columns: string[];
    aggregation: "COUNT" | "SUM" | "AVG" | "LIST" | null;
    aggregation_column: string | null;
    date_filter: {
        column: string;
        range: "today" | "this_week" | "this_month" | "this_year" | "last_month";
    } | null;
    extra_filter: {
        column: string;
        value: string;
    } | null;
}

export interface ExecutionResult {
    data: any[];
    error: string | null;
}
