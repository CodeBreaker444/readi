import {
  ClientOption,
  DroneOption,
  MissionCategoryOption,
  MissionPlanOption,
  MissionResultOption,
  MissionStatusOption,
  MissionTypeOption,
  OperationFilterParams,
  OperationLogbookItem,
  PilotOption,
} from '@/config/types/logbook';
import { prisma } from '@/lib/prisma';

const STATUS_ID_TO_DESC: Record<number, string> = {
  1: 'PLANNED',
  2: 'IN_PROGRESS',
  3: 'COMPLETED',
};

export async function getOperationLogbookList(
  params: OperationFilterParams
): Promise<{ code: number; message: string; dataRows: number; data: OperationLogbookItem[] }> {
  const where: any = { fk_owner_id: params.owner_id };

  if (params.pic_id && params.pic_id !== 0)
    where.fk_pilot_user_id = params.pic_id;
  if (params.vehicle_id && params.vehicle_id !== 0)
    where.fk_tool_id = params.vehicle_id;
  if (params.mission_status_id && params.mission_status_id !== 0)
    where.fk_mission_status_id = params.mission_status_id;
  if (params.mission_type_id && params.mission_type_id !== 0)
    where.fk_mission_type_id = params.mission_type_id;
  if (params.mission_category_id && params.mission_category_id !== 0)
    where.fk_mission_category_id = params.mission_category_id;
  if (params.mission_result_id && params.mission_result_id !== 0)
    where.fk_mission_result_type_id = params.mission_result_id;
  if (params.client_id && params.client_id !== 0)
    where.fk_client_id = params.client_id;
  if (params.date_start)
    where.actual_start = { ...(where.actual_start ?? {}), gte: new Date(params.date_start) };
  if (params.date_end)
    where.actual_start = { ...(where.actual_start ?? {}), lte: new Date(params.date_end + 'T23:59:59') };

  if (params.mission_plan_id && params.mission_plan_id !== 0) {
    const planLookup = await prisma.planning_logbook.findFirst({
      where: { mission_planning_id: params.mission_plan_id },
      select: { fk_planning_id: true },
    });
    if (planLookup?.fk_planning_id) {
      where.fk_planning_id = planLookup.fk_planning_id;
    }
  }

  const data = await prisma.pilot_mission.findMany({
    where,
    select: {
      pilot_mission_id: true,
      fk_mission_status_id: true,
      fk_client_id: true,
      actual_start: true,
      actual_end: true,
      flight_duration: true,
      distance_flown: true,
      notes: true,
      users: { select: { user_id: true, first_name: true, last_name: true } },
      tool: { select: { tool_id: true, tool_code: true, tool_name: true, tool_status: { select: { status_code: true } } } },
      pilot_mission_type: { select: { mission_type_id: true, type_name: true } },
      pilot_mission_status: { select: { status_id: true, status_name: true } },
      pilot_mission_category: { select: { category_id: true, category_name: true } },
      pilot_mission_result_type: { select: { result_type_id: true, result_type_desc: true } },
      planning: {
        select: {
          planning_id: true,
          fk_client_id: true,
          client: { select: { client_id: true, client_name: true } },
          planning_logbook: {
            select: {
              mission_planning_id: true,
              mission_planning_code: true,
              mission_planning_desc: true,
            },
            take: 1,
          },
        },
      },
      client: { select: { client_id: true, client_name: true } },
    },
    orderBy: { pilot_mission_id: 'desc' },
  });

  const mapped: OperationLogbookItem[] = data.map((row) => {
    const startDT = row.actual_start;
    const endDT = row.actual_end;

    return {
      mission_id: row.pilot_mission_id,
      date_start: startDT ? startDT.toISOString().split('T')[0] : '',
      date_end: endDT ? endDT.toISOString().split('T')[0] : '',
      time_start: startDT ? startDT.toTimeString().slice(0, 5) : '',
      time_end: endDT ? endDT.toTimeString().slice(0, 5) : '',
      pic_fullname: row.users
        ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim()
        : '',
      client_name:
        row.client?.client_name ??
        row.planning?.client?.client_name ??
        '',
      mission_category_desc: row.pilot_mission_category?.category_name ?? '',
      mission_type_desc: row.pilot_mission_type?.type_name ?? '',
      vehicle_code: row.tool?.tool_code ?? '',
      vehicle_desc: row.tool?.tool_name ?? '',
      mission_status_desc:
        STATUS_ID_TO_DESC[row.fk_mission_status_id ?? 0] ??
        row.pilot_mission_status?.status_name ??
        '',
      mission_result_desc: row.pilot_mission_result_type?.result_type_desc ?? '',
      fk_mission_planning_id: row.planning?.planning_logbook?.[0]?.mission_planning_id ?? 0,
      mission_planning_code: row.planning?.planning_logbook?.[0]?.mission_planning_code ?? '',
      mission_planning_desc: row.planning?.planning_logbook?.[0]?.mission_planning_desc ?? '',
      flown_time: row.flight_duration ?? 0,
      flown_meter: Number(row.distance_flown ?? 0),
      mission_notes: row.notes ?? '',
    };
  });

  return { code: 200, message: 'success', dataRows: mapped.length, data: mapped };
}


export async function getOperationLogbookFilters(owner_id: number) {
  const [pilots, clients, drones, missionTypes, missionCategories, missionResults, missionStatuses, missionPlans] =
    await Promise.all([
      prisma.public_users.findMany({
        where:  { fk_owner_id: owner_id, user_role: 'PIC', user_active: 'Y' },
        select: { user_id: true, first_name: true, last_name: true },
      }),
      prisma.client.findMany({
        where:  { fk_owner_id: owner_id, client_active: 'Y' },
        select: { client_id: true, client_name: true },
      }),
      prisma.tool.findMany({
        where:  { fk_owner_id: owner_id, tool_active: 'Y' },
        select: { tool_id: true, tool_code: true, tool_name: true },
      }),
      prisma.pilot_mission_type.findMany({
        where:  { fk_owner_id: owner_id, is_active: true },
        select: { mission_type_id: true, type_name: true },
      }),
      prisma.pilot_mission_category.findMany({
        where:  { fk_owner_id: owner_id, is_active: true },
        select: { category_id: true, category_name: true },
      }),
      prisma.pilot_mission_result_type.findMany({
        where:  { fk_owner_id: owner_id, is_active: true },
        select: { result_type_id: true, result_type_desc: true },
      }),
      prisma.pilot_mission_status.findMany({
        where:  { fk_owner_id: owner_id, is_active: true },
        select: { status_id: true, status_name: true },
      }),
      prisma.planning_logbook.findMany({
        where:  { fk_owner_id: owner_id, mission_planning_active: 'Y' },
        select: { mission_planning_id: true, mission_planning_code: true, mission_planning_desc: true },
      }),
    ]);

  const pilotOptions: PilotOption[] = pilots.map((u) => ({
    user_id: u.user_id,
    fullname: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    pilot_status_desc: 'ACTIVE',
  }));

  const clientOptions: ClientOption[] = clients.map((c) => ({
    client_id: c.client_id,
    client_name: c.client_name,
  }));

  const droneOptions: DroneOption[] = drones.map((t) => ({
    tool_id: t.tool_id,
    tool_code: t.tool_code ?? '',
    tool_desc: t.tool_name ?? '',
    tool_status: 'OPERATIONAL',
  }));

  const typeOptions: MissionTypeOption[] = missionTypes.map((t) => ({
    mission_type_id: t.mission_type_id,
    mission_type_desc: t.type_name,
  }));

  const categoryOptions: MissionCategoryOption[] = missionCategories.map((c) => ({
    mission_category_id: c.category_id,
    mission_category_desc: c.category_name,
  }));

  const resultOptions: MissionResultOption[] = missionResults.map((r) => ({
    mission_result_id: r.result_type_id,
    mission_result_desc: r.result_type_desc ?? '',
  }));

  const statusOptions: MissionStatusOption[] = missionStatuses.map((s) => ({
    mission_status_id: s.status_id,
    mission_status_desc: s.status_name,
  }));

  const planOptions: MissionPlanOption[] = missionPlans.map((p) => ({
    mission_planning_id: p.mission_planning_id,
    mission_planning_code: p.mission_planning_code ?? '',
    mission_planning_desc: p.mission_planning_desc ?? '',
  }));

  return {
    code: 200,
    pilots: { data: pilotOptions },
    clients: { data: clientOptions },
    drones: { data: droneOptions },
    missionTypes: { data: typeOptions },
    missionCategories: { data: categoryOptions },
    missionResults: { data: resultOptions },
    missionStatuses: { data: statusOptions },
    missionPlans: { data: planOptions },
  };
}
