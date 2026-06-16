import { prisma } from '@/lib/prisma';

export async function getToolName(toolId: number): Promise<string> {
  const data = await prisma.tool.findUnique({
    where: { tool_id: toolId },
    select: { tool_code: true, tool_name: true },
  });
  return data?.tool_code ?? data?.tool_name ?? `System #${toolId}`;
}

export async function getUserName(userId: number): Promise<string> {
  const data = await prisma.public_users.findUnique({
    where: { user_id: userId },
    select: { first_name: true, last_name: true },
  });
  return data
    ? [data.first_name, data.last_name].filter(Boolean).join(' ') || `User #${userId}`
    : `User #${userId}`;
}
