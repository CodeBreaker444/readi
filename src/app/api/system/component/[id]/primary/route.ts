import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ is_primary: z.boolean() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ code: 0, message: 'Invalid data' }, { status: 400 });

    const existing = await prisma.tool_component.findUnique({
      where: { component_id: Number(id) },
      select: { component_metadata: true },
    });

    const updatedMeta = {
      ...((existing?.component_metadata as Record<string, unknown>) ?? {}),
      is_primary: parsed.data.is_primary,
    };

    await prisma.tool_component.update({
      where: { component_id: Number(id) },
      data: { component_metadata: updatedMeta },
    });

    return NextResponse.json({ code: 1, message: 'Primary flag updated' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
