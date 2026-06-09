import { prisma } from '@/lib/prisma';
import { TOKEN_LIMITS } from './token-limits';

interface UsageRecord {
  user_id: number;
  owner_id: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model: string;
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getUserDailyTokens(userId: number): Promise<number> {
  const result = await prisma.ai_token_usage.aggregate({
    _sum: { total_tokens: true },
    where: { user_id: userId, created_at: { gte: todayStart() } },
  });
  return result._sum.total_tokens ?? 0;
}

export async function getPlatformDailyTokens(): Promise<number> {
  const result = await prisma.ai_token_usage.aggregate({
    _sum: { total_tokens: true },
    where: { created_at: { gte: todayStart() } },
  });
  return result._sum.total_tokens ?? 0;
}

export async function checkTokenLimits(
  userId: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const [userDaily, platformDaily] = await Promise.all([
    getUserDailyTokens(userId),
    getPlatformDailyTokens(),
  ]);

  if (platformDaily >= TOKEN_LIMITS.PLATFORM_DAILY) {
    return {
      allowed: false,
      reason: 'Platform daily token limit reached. Please try again tomorrow.',
    };
  }

  if (userDaily >= TOKEN_LIMITS.PER_USER_DAILY) {
    return {
      allowed: false,
      reason: 'Your daily token limit has been reached. Please try again tomorrow.',
    };
  }

  return { allowed: true };
}

export async function recordTokenUsage(record: UsageRecord): Promise<void> {
  await prisma.ai_token_usage.create({ data: record });
}
