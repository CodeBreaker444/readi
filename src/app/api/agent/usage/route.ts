import { getUserSession } from "@/lib/auth/server-session";
import { getSupabase } from "@mcp-server/lib/supabase";
import { NextResponse } from "next/server";
import { TOKEN_LIMITS } from "../../../../lib/token-limits";
import { forbidden, internalError, unauthorized } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
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
            return unauthorized(E.AU001);
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

            const byUserId: Record<number, number> = {};
            for (const r of rows ?? []) {
                byUserId[r.user_id] = (byUserId[r.user_id] ?? 0) + r.total_tokens;
            }

            const userIds = Object.keys(byUserId).map(Number);
            const { data: userRows } = await supabase
                .from('users')
                .select('user_id, email')
                .in('user_id', userIds);

            const idToEmail: Record<number, string> = {};
            for (const u of userRows ?? []) {
                idToEmail[u.user_id] = u.email;
            }

            const byUser: Record<string, number> = {};
            for (const [id, tokens] of Object.entries(byUserId)) {
                const email = idToEmail[Number(id)] ?? `user_${id}`;
                byUser[email] = tokens;
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

        return forbidden(E.PX001);

    } catch (err) {
        return internalError(E.SV001, err);
    }
}
