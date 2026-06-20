import { getUserSession } from "@/lib/auth/server-session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { TOKEN_LIMITS } from "../../../../lib/token-limits";
import { forbidden, internalError, unauthorized } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
export const dynamic = "force-dynamic";

function todayStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export async function GET() {
    try {
        const session = await getUserSession();
        if (!session) {
            return unauthorized(E.AU001);
        }

        const { role, ownerId } = session.user;
        const today = todayStart();

        if (role === 'SUPERADMIN') {
            const [rows, allTimeResult] = await Promise.all([
                prisma.ai_token_usage.findMany({
                    where: { created_at: { gte: today } },
                    select: { owner_id: true, total_tokens: true },
                }),
                prisma.ai_token_usage.aggregate({ _sum: { total_tokens: true } }),
            ]);

            const platformTotal = rows.reduce((s, r) => s + r.total_tokens, 0);
            const platformAllTime = allTimeResult._sum.total_tokens ?? 0;

            const byCompany: Record<number, number> = {};
            for (const r of rows) {
                byCompany[r.owner_id] = (byCompany[r.owner_id] ?? 0) + r.total_tokens;
            }

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
            const [rows, allTimeResult, platformResult] = await Promise.all([
                prisma.ai_token_usage.findMany({
                    where: { owner_id: ownerId, created_at: { gte: today } },
                    select: { user_id: true, total_tokens: true },
                }),
                prisma.ai_token_usage.aggregate({
                    _sum: { total_tokens: true },
                    where: { owner_id: ownerId },
                }),
                prisma.ai_token_usage.aggregate({
                    _sum: { total_tokens: true },
                    where: { created_at: { gte: today } },
                }),
            ]);

            const companyTotal = rows.reduce((s, r) => s + r.total_tokens, 0);
            const companyAllTime = allTimeResult._sum.total_tokens ?? 0;
            const platformTotal = platformResult._sum.total_tokens ?? 0;

            const byUserId: Record<number, number> = {};
            for (const r of rows) {
                byUserId[r.user_id] = (byUserId[r.user_id] ?? 0) + r.total_tokens;
            }

            const userIds = Object.keys(byUserId).map(Number);
            const userRows = await prisma.public_users.findMany({
                where: { user_id: { in: userIds } },
                select: { user_id: true, email: true },
            });

            const idToEmail: Record<number, string> = {};
            for (const u of userRows) {
                idToEmail[u.user_id] = u.email ?? `user_${u.user_id}`;
            }

            const byUser: Record<string, number> = {};
            for (const [id, tokens] of Object.entries(byUserId)) {
                const email = idToEmail[Number(id)] ?? `user_${id}`;
                byUser[email] = tokens;
            }

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
