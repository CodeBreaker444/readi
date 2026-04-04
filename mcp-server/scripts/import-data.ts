import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match && !process.env[match[1]])
            process.env[match[1]] = match[2];
    }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DUMP_PATH = resolve(process.cwd(), "../database-dump.sql");

async function execSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc("exec_sql", { query: sql });
    if (error) 
        return { 
            ok: false, 
            error: error.message 
        };

    if (data && !data.ok) 
        return { 
            ok: false, 
            error: data.error 
        };

    return { 
        ok: true 
    };
}

function extractStatements(dump: string): string[] {
    const stmts: string[] = [];
    const lines = dump.split("\n");
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.startsWith("--") || line.trim() === "" || line.startsWith("SET ") ||
            line.startsWith("SELECT pg_catalog.set_config") || line.startsWith("\\")) {
            i++;
            continue;
        }

        if (line.startsWith("COPY public.") && line.includes("FROM stdin;")) {
            let block = line + "\n";
            i++;
            while (i < lines.length && lines[i] !== "\\.") {
                block += lines[i] + "\n";
                i++;
            }
            if (i < lines.length) {
                block += "\\.";
                i++;
            }
            stmts.push(block);
            continue;
        }

        if (line.startsWith("CREATE TABLE public.")) {
            let block = line + "\n";
            i++;
            while (i < lines.length && !lines[i].startsWith(");")) {
                block += lines[i] + "\n";
                i++;
            }

            if (i < lines.length) {
                block += lines[i];
                i++;
            }

            stmts.push(block);
            continue;
        }

        if (line.startsWith("CREATE SEQUENCE public.")) {
            let block = line + "\n";
            i++;
            while (i < lines.length && !lines[i].trimEnd().endsWith(";")) {
                block += lines[i] + "\n";
                i++;
            }
            if (i < lines.length) {
                block += lines[i];
                if (lines[i].trimEnd().endsWith(";")) {
                    i++;
                    while (i < lines.length && lines[i].startsWith("ALTER SEQUENCE")) {
                        block += "\n" + lines[i];
                        i++;
                    }
                }
            }
            stmts.push(block);
            continue;
        }

        if (line.startsWith("CREATE FUNCTION public.") || line.startsWith("CREATE OR REPLACE FUNCTION public.")) {
            let block = line + "\n";
            i++;
            while (i < lines.length && !lines[i].trimEnd().endsWith("$$;")) {
                block += lines[i] + "\n";
                i++;
            }
            if (i < lines.length) {
                block += lines[i];
                i++;
            }
            stmts.push(block);
            continue;
        }

        if ((line.startsWith("ALTER TABLE ONLY public.") ||
            line.startsWith("ALTER SEQUENCE public.") ||
            line.startsWith("SELECT pg_catalog.setval('public.")) && line.trimEnd().endsWith(";")) {
            stmts.push(line);
            i++;
            continue;
        }

        if (line.startsWith("ALTER TABLE ONLY public.") && !line.trimEnd().endsWith(";")) {
            let block = line + "\n";
            i++;
            while (i < lines.length && !lines[i].trimEnd().endsWith(";")) {
                block += lines[i] + "\n";
                i++;
            }
            if (i < lines.length) {
                block += lines[i];
                i++;
            }
            stmts.push(block);
            continue;
        }

        i++;
    }

    return stmts;
}

async function main() {
    console.log("Reading database dump...");
    const dump = readFileSync(DUMP_PATH, "utf8");
    console.log(`Size: ${(dump.length / 1024).toFixed(0)} KB`);

    console.log("\nTesting exec_sql function...");
    const test = await execSQL("SELECT 1");
    if (!test.ok) {
        console.error("exec_sql function not available!");
        console.error("Error:", test.error);
        console.error("\n   Please run this SQL in the Supabase SQL Editor:");
        console.error(`
            CREATE OR REPLACE FUNCTION public.exec_sql(query text)
            RETURNS json
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $$
            DECLARE
            result json;
            BEGIN
            EXECUTE query;
            RETURN '{"ok": true}'::json;
            EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object('ok', false, 'error', SQLERRM);
            END;
            $$;
`);
        process.exit(1);
    }
    console.log("exec_sql works");

    console.log("\nExtracting statements...");
    const stmts = extractStatements(dump);
    console.log(`${stmts.length} statements`);

    const drops: string[] = [];
    const creates: string[] = [];
    const copies: string[] = [];
    const alters: string[] = [];
    const setvals: string[] = [];
    const rest: string[] = [];

    for (const stmt of stmts) {
        const first = stmt.split("\n")[0];
        if (first.startsWith("CREATE TABLE")) 
            creates.push(stmt);
        else if (first.startsWith("CREATE SEQUENCE")) 
            creates.push(stmt);
        else if (first.startsWith("COPY public.")) 
            copies.push(stmt);
        else if (first.startsWith("ALTER TABLE")) 
            alters.push(stmt);
        else if (first.startsWith("ALTER SEQUENCE")) 
            alters.push(stmt);
        else if (first.startsWith("SELECT pg_catalog.setval")) 
            setvals.push(stmt);
        else rest.push(stmt);
    }

    console.log(`Tables/Sequences: ${creates.length}`);
    console.log(`Data blocks: ${copies.length}`);
    console.log(`Alters: ${alters.length}`);
    console.log(`Setvals: ${setvals.length}`);
    console.log(`Other: ${rest.length}`);

    let ok = 0, failed = 0;

    console.log("\n=== Phase 1: Preparing (dropping existing tables) ===");
    const tableNames = creates.filter(s => s.startsWith("CREATE TABLE"))
        .map(s => {
            const m = s.match(/CREATE TABLE public\.(\w+)/);
            return m ? m[1] : null;
        }).filter(Boolean) as string[];

    for (const tname of tableNames) {
        const res = await execSQL(`DROP TABLE IF EXISTS public.${tname} CASCADE;`);
        if (!res.ok) 
            console.log(`Drop ${tname}: ${res.error}`);
    }

    const seqNames = creates.filter(s => s.startsWith("CREATE SEQUENCE"))
        .map(s => {
            const m = s.match(/CREATE SEQUENCE public\.(\w+)/);
            return m ? m[1] : null;
        }).filter(Boolean) as string[];

    for (const sname of seqNames)
        await execSQL(`DROP SEQUENCE IF EXISTS public.${sname} CASCADE;`);

    console.log("\n=== Phase 2: Creating tables + sequences ===");
    for (let i = 0; i < creates.length; i++) {
        const first = creates[i].split("\n")[0].slice(0, 70);
        const res = await execSQL(creates[i]);
        if (res.ok) 
            { 
                ok++; 
            }
        else {
            failed++;
            console.log(`${first} — ${res.error?.slice(0, 80)}`);
        }
    }
    console.log(`${ok} created,${failed} failed`);

    console.log("\n=== Phase 3: Column defaults ===");
    const defaults = alters.filter(s => s.includes("SET DEFAULT"));
    const constraints = alters.filter(s => !s.includes("SET DEFAULT"));
    ok = 0; failed = 0;
    for (const d of defaults) {
        const res = await execSQL(d);
        if (res.ok) 
            ok++;
        else {
            failed++
        }
    }
    console.log(`${ok} defaults set, ${failed} failed`);

    console.log("\n=== Phase 4: Importing data ===");
    ok = 0; failed = 0;

    const copyToInsert = (copyBlock: string) => {
        const lines = copyBlock.split("\n");
        const header = lines[0]; 
        const match = header.match(/COPY public\.(\w+) \(([^)]+)\) FROM stdin;/);
        if (!match) return null;

        const tableName = match[1];
        const columns = match[2];
        const dataLines = lines.slice(1, -1); 

        if (dataLines.length === 0) 
            return null;

        const values = dataLines.map(line => {
            const parts = line.split("\t");
            const formattedParts = parts.map(p => {
                if (p === "\\N")
                    return "NULL";
                const escaped = p.replace(/'/g, "''");
                return `'${escaped}'`;
            });
            return `(${formattedParts.join(", ")})`;
        });

        const chunks = [];
        const chunkSize = 100;
        for (let i = 0; i < values.length; i += chunkSize) {
            const chunk = values.slice(i, i + chunkSize);
            chunks.push(`INSERT INTO public.${tableName} (${columns}) VALUES ${chunk.join(", ")};`);
        }
        return chunks;
    };

    for (let i = 0; i < copies.length; i++) {
        const tname = copies[i].match(/COPY public\.(\w+)/)?.[1] ?? "?";
        const insertStmts = copyToInsert(copies[i]);

        if (!insertStmts) {
            console.log(`[${i + 1}/${copies.length}] ${tname} (0 rows)... ✓`);
            ok++;
            continue;
        }

        process.stdout.write(`[${i + 1}/${copies.length}] ${tname} (${insertStmts.length} insert batches)... `);

        let tableOk = true;
        for (const sql of insertStmts) {
            const res = await execSQL(sql);
            if (!res.ok) {
                console.log(`✗ Batch failed: ${res.error?.slice(0, 100)}`);
                tableOk = false;
                break;
            }
        }

        if (tableOk) {
            console.log("✓");
            ok++;
        } else {
            failed++;
        }
    }
    console.log(`${ok} tables imported, ${failed} failed`);

    console.log("\n=== Phase 5: Constraints ===");
    ok = 0; failed = 0;
    for (const c of constraints) {
        const res = await execSQL(c);
        if (res.ok) 
            ok++;
        else 
            failed++;
    }
    console.log(`${ok} constraints, ${failed} failed`);

    console.log("\n=== Phase 6: Sequence values ===");
    ok = 0; failed = 0;
    for (const sv of setvals) {
        const res = await execSQL(sv);
        if (res.ok) 
            ok++;
        else 
            failed++;
    }
    console.log(`${ok} sequences set, ${failed} failed`);

    console.log("\n=== Phase 7: Functions ===");
    ok = 0; failed = 0;
    for (const fn of rest) {
        const res = await execSQL(fn);
        if (res.ok) 
            ok++;
        else 
            failed++;
    }
    console.log(`${ok} other, ${failed} failed`);

    console.log("\nImport complete!");
}

main().catch(console.error);