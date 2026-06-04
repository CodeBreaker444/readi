import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 config — connection URLs live here, not in schema.prisma
//
// DATABASE_URL : pooler URL in production (PgBouncer port 6543) or direct URL locally
//                → used by PrismaClient at runtime via PrismaPg adapter (src/lib/prisma.ts)
//
// DIRECT_URL   : always the raw Postgres connection (no pooler)
//                → used by the CLI (`prisma migrate`, `prisma db pull`) to bypass PgBouncer
//                  (required when connecting to Supabase cloud)

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: (process.env.DIRECT_URL ?? process.env.DATABASE_URL)!,
  },
});
