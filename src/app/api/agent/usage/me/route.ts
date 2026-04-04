import { getUserSession } from "@/lib/auth/server-session";
import { getPlatformDailyTokens, getUserDailyTokens } from "@/lib/token-tracker";
import { NextResponse } from "next/server";
import { TOKEN_LIMITS } from "../../../../../lib/token-limits";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getUserSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [userUsed, platformUsed] = await Promise.all([
            getUserDailyTokens(session.user.userId),
            getPlatformDailyTokens(),
        ]);

        const userPercent = Math.min(100, Math.round((userUsed / TOKEN_LIMITS.PER_USER_DAILY) * 100));
        const platformPercent = Math.min(100, Math.round((platformUsed / TOKEN_LIMITS.PLATFORM_DAILY) * 100));

        return NextResponse.json({
            user: {
                used: userUsed,
                limit: TOKEN_LIMITS.PER_USER_DAILY,
                remaining: Math.max(0, TOKEN_LIMITS.PER_USER_DAILY - userUsed),
                percent: userPercent,
            },
            platform: {
                used: platformUsed,
                limit: TOKEN_LIMITS.PLATFORM_DAILY,
                remaining: Math.max(0, TOKEN_LIMITS.PLATFORM_DAILY - platformUsed),
                percent: platformPercent,
            },
        });
    } catch (error: any) {
        console.error("Usage/me error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
