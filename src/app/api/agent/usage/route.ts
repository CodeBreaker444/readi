import { getUserSession } from "@/lib/auth/server-session";
import { getSupabase } from "@mcp-server/lib/supabase";
import { NextResponse } from "next/server";
import { TOKEN_LIMITS } from "../../../../lib/token-limits";

export const dynamic = "force-dynamic";

function todayStart(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

export async function GET() {
    try {
        const session = await getUserSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { role, ownerId } = session.user;
        const supabase = getSupabase();
        const today = todayStart();

        if (role === 'SUPERADMIN') {
            // Platform-wide totals + per-company breakdown
            const { data: rows } = await supabase
                .from('ai_token_usage')
                .select('owner_id, total_tokens, created_at')
                .gte('created_at', today);

            const platformTotal = (rows ?? []).reduce((s, r) => s + r.total_tokens, 0);

            const byCompany: Record<number, number> = {};
            for (const r of rows ?? []) {
                byCompany[r.owner_id] = (byCompany[r.owner_id] ?? 0) + r.total_tokens;
            }

            const { data: allTime } = await supabase
                .from('ai_token_usage')
                .select('total_tokens');
            const platformAllTime = (allTime ?? []).reduce((s, r) => s + r.total_tokens, 0);

            return NextResponse.json({
                scope: 'platform',
                today: {
                    used: platformTotal,
                    limit: TOKEN_LIMITS.PLATFORM_DAILY,
                    remaining: Math.max(0, TOKEN_LIMITS.PLATFORM_DAILY - platformTotal),
                    percent: Math.min(100, Math.round((platformTotal / TOKEN_LIMITS.PLATFORM_DAILY) * 100)),
                },
                allTime: platformAllTime,
                byCompany,
            });
        }

        if (role === 'ADMIN') {
            // Company-wide totals
            const { data: rows } = await supabase
                .from('ai_token_usage')
                .select('user_id, total_tokens, created_at')
                .eq('owner_id', ownerId)
                .gte('created_at', today);

            const companyTotal = (rows ?? []).reduce((s, r) => s + r.total_tokens, 0);

            const byUser: Record<number, number> = {};
            for (const r of rows ?? []) {
                byUser[r.user_id] = (byUser[r.user_id] ?? 0) + r.total_tokens;
            }

            const { data: allTime } = await supabase
                .from('ai_token_usage')
                .select('total_tokens')
                .eq('owner_id', ownerId);
            const companyAllTime = (allTime ?? []).reduce((s, r) => s + r.total_tokens, 0);

            // Platform total so admin can see where their company stands
            const { data: platformRows } = await supabase
                .from('ai_token_usage')
                .select('total_tokens')
                .gte('created_at', today);
            const platformTotal = (platformRows ?? []).reduce((s, r) => s + r.total_tokens, 0);

            return NextResponse.json({
                scope: 'company',
                today: {
                    companyUsed: companyTotal,
                    platformUsed: platformTotal,
                    platformLimit: TOKEN_LIMITS.PLATFORM_DAILY,
                    platformRemaining: Math.max(0, TOKEN_LIMITS.PLATFORM_DAILY - platformTotal),
                    platformPercent: Math.min(100, Math.round((platformTotal / TOKEN_LIMITS.PLATFORM_DAILY) * 100)),
                },
                allTime: companyAllTime,
                byUser,
                perUserLimit: TOKEN_LIMITS.PER_USER_DAILY,
            });
        }

        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    } catch (error: any) {
        console.error("Usage API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
