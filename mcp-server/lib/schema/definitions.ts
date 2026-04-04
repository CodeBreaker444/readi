export interface ColumnDef {
    name: string;
    type: string;
    description: string;
}

export interface TableDef {
    table: string;
    description: string;
    columns: ColumnDef[];
}

export const SCHEMA: TableDef[] = [
    {
        table: "users",
        description: "Stores all registered user accounts.",
        columns: [
            { name: "id", type: "uuid", description: "Primary key" },
            { name: "email", type: "text", description: "Unique email address" },
            { name: "full_name", type: "text", description: "User display name" },
            { name: "created_at", type: "timestamp", description: "Account creation date" },
            { name: "role", type: "text", description: "admin | member | viewer" },
        ],
    },
    {
        table: "projects",
        description: "Top-level work containers owned by users.",
        columns: [
            { name: "id", type: "uuid", description: "Primary key" },
            { name: "owner_id", type: "uuid", description: "FK -> users.id" },
            { name: "name", type: "text", description: "Project display name" },
            { name: "status", type: "text", description: "active | archived | draft" },
            { name: "deadline", type: "date", description: "Target completion date" },
        ],
    },
    {
        table: "tasks",
        description: "Individual work items belonging to a project.",
        columns: [
            { name: "id", type: "uuid", description: "Primary key" },
            { name: "project_id", type: "uuid", description: "FK -> projects.id" },
            { name: "assignee_id", type: "uuid", description: "FK -> users.id" },
            { name: "title", type: "text", description: "Short task description" },
            { name: "priority", type: "int", description: "1 (low) - 5 (critical)" },
            { name: "completed_at", type: "timestamp", description: "Null if not done" },
        ],
    },
    {
        table: "invoices",
        description: "Billing records linked to projects.",
        columns: [
            { name: "id", type: "uuid", description: "Primary key" },
            { name: "project_id", type: "uuid", description: "FK -> projects.id" },
            { name: "amount_cents", type: "int", description: "Amount in USD cents" },
            { name: "status", type: "text", description: "draft | sent | paid | void" },
            { name: "due_date", type: "date", description: "Payment due date" },
            { name: "paid_at", type: "timestamp", description: "Null if unpaid" },
        ],
    },
];

export function schemaToChunks() {
    const chunks = [];
    for (const t of SCHEMA) {
        chunks.push({
            id: "table:" + t.table,
            text: 'Table "' + t.table + '": ' + t.description + " Columns: " + t.columns.map(c => c.name + " (" + c.type + ")").join(", "),
            meta: { table: t.table, kind: "table" },
        });
        for (const c of t.columns) {
            chunks.push({
                id: "col:" + t.table + "." + c.name,
                text: 'Column "' + c.name + '" in "' + t.table + '" (' + c.type + '): ' + c.description,
                meta: { table: t.table, column: c.name, kind: "column" },
            });
        }
    }
    return chunks;
}
