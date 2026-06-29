import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_operations');
    if (error) return error;

    const droneSerialNumber = req.nextUrl.searchParams.get('droneSerialNumber');
    const ownerId = req.nextUrl.searchParams.get('ownerId');

    if (!droneSerialNumber) {
      return NextResponse.json({ code: 0, message: 'droneSerialNumber is required' }, { status: 400 });
    }

    if (!ownerId) {
      return NextResponse.json({ code: 0, message: 'ownerId is required' }, { status: 400 });
    }

    // Find tool component with matching serial number
    const toolComponent = await prisma.tool_component.findFirst({
      where: {
        serial_number: droneSerialNumber,
        tool: {
          fk_owner_id: Number(ownerId),
        },
      },
      select: {
        fk_tool_id: true,
      },
    });

    if (!toolComponent) {
      return NextResponse.json({ code: 1, data: [] });
    }

    // Find completed missions with the same tool that don't have flight logs
    const missionsWithLogs = await prisma.mission_flight_logs.findMany({
      where: {
        log_source: 'flytbase',
      },
      select: {
        fk_mission_id: true,
      },
      distinct: ['fk_mission_id'],
    });

    const missionIdsWithLogs = new Set(missionsWithLogs.map((log) => log.fk_mission_id.toString()));

    const missions = await prisma.pilot_mission.findMany({
      where: {
        fk_tool_id: toolComponent.fk_tool_id,
        fk_owner_id: Number(ownerId),
        status_name: 'Completed',
        pilot_mission_id: {
          notIn: Array.from(missionIdsWithLogs).map((id) => Number(id)),
        },
      },
      select: {
        pilot_mission_id: true,
        mission_code: true,
        mission_name: true,
        actual_start: true,
        actual_end: true,
        location: true,
        tool: {
          select: {
            tool_code: true,
            tool_name: true,
          },
        },
        users: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        actual_start: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({ code: 1, data: missions });
  } catch (err) {
    console.error('[GET /api/operation/missions/attachable]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
