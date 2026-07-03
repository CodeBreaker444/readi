import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendExpirationNotifications } from '@/backend/services/system/expiration-notification';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get all expired components across all owners
    const expiredComponents = await prisma.tool_component.findMany({
      where: {
        component_active: 'Y',
        expiration_date: { lte: today },
        tool: { tool_active: 'Y' },
      },
      select: {
        component_id: true,
        component_name: true,
        fk_tool_id: true,
        expiration_date: true,
        tool: {
          select: {
            tool_id: true,
            tool_code: true,
            fk_owner_id: true,
          },
        },
      },
    });

    if (expiredComponents.length === 0) {
      return NextResponse.json({
        message: 'No expired components found',
        processed: 0,
      });
    }

    // Group by owner and send notifications
    const ownerMap = new Map<number, any[]>();

    for (const comp of expiredComponents) {
      const ownerId = comp.tool.fk_owner_id;
      if (!ownerMap.has(ownerId)) {
        ownerMap.set(ownerId, []);
      }
      ownerMap.get(ownerId)!.push({
        tool_component_id: comp.component_id,
        component_name: comp.component_name,
        tool_id: comp.tool.tool_id,
        tool_code: comp.tool.tool_code,
        expiration_date: comp.expiration_date?.toISOString() || '',
      });
    }

    let processedOwners = 0;
    let errors = 0;

    for (const [ownerId, components] of ownerMap.entries()) {
      try {
        await sendExpirationNotifications(ownerId, components);
        processedOwners++;
      } catch (error) {
        console.error(`[Cron] Failed to send expiration notifications for owner ${ownerId}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Component expiration check completed',
      expiredComponents: expiredComponents.length,
      processedOwners,
      errors,
    });
  } catch (error) {
    console.error('[Cron] Component expiration check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
