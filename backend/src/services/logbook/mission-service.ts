import { prisma } from '@/lib/prisma';
import type {
  EvaluationOption,
  FilterParams,
  MissionPlanningLogbookItem,
  PilotOption,
  PlanningOption,
} from '@/config/types/logbook';

export async function getMissionPlanningLogbookList(
  params: FilterParams
): Promise<{ code: number; data: MissionPlanningLogbookItem[] }> {
  const where: any = { fk_owner_id: params.owner_id };

  if (params.client_id && params.client_id !== 0)
    where.fk_client_id = params.client_id;
  if (params.evaluation_id && params.evaluation_id !== 0)
    where.fk_evaluation_id = params.evaluation_id;
  if (params.planning_id && params.planning_id !== 0)
    where.fk_planning_id = params.planning_id;
  if (params.user_id && params.user_id !== 0)
    where.fk_user_id = params.user_id;
  if (params.date_start)
    where.updated_at = { ...(where.updated_at ?? {}), gte: new Date(params.date_start) };
  if (params.date_end)
    where.updated_at = { ...(where.updated_at ?? {}), lte: new Date(params.date_end + 'T23:59:59') };

  const data = await prisma.planning_logbook.findMany({
    where,
    select: {
      mission_planning_id: true,
      mission_planning_code: true,
      mission_planning_desc: true,
      mission_planning_ver: true,
      mission_planning_filename: true,
      mission_planning_active: true,
      fk_evaluation_id: true,
      fk_planning_id: true,
      fk_client_id: true,
      fk_owner_id: true,
      client: { select: { client_name: true } },
      evaluation: { select: { evaluation_name: true } },
      planning: { select: { planning_name: true } },
    },
    orderBy: { mission_planning_id: 'desc' },
  });

  const planningIds = [...new Set(data.map((r) => r.fk_planning_id).filter(Boolean))] as number[];
  let testCountMap: Record<number, number> = {};

  if (planningIds.length > 0) {
    const testData = await prisma.planning_test_logbook.findMany({
      where: { fk_planning_id: { in: planningIds } },
      select: { fk_planning_id: true },
    });

    testCountMap = testData.reduce<Record<number, number>>((acc, row) => {
      acc[row.fk_planning_id] = (acc[row.fk_planning_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const mapped: MissionPlanningLogbookItem[] = data.map((row) => ({
    mission_planning_id: row.mission_planning_id,
    client_name: row.client?.client_name ?? '',
    evaluation_desc: row.evaluation?.evaluation_name ?? '',
    planning_desc: row.planning?.planning_name ?? '',
    mission_planning_desc: row.mission_planning_desc ?? '',
    mission_planning_code: row.mission_planning_code ?? '',
    mission_planning_ver: row.mission_planning_ver ?? 1,
    mission_planning_filename: row.mission_planning_filename ?? '',
    mission_planning_active: row.mission_planning_active ?? 'N',
    tot_test: testCountMap[row.fk_planning_id] ?? 0,
    fk_evaluation_id: row.fk_evaluation_id ?? 0,
    fk_planning_id: row.fk_planning_id ?? 0,
    fk_client_id: row.fk_client_id ?? 0,
    fk_owner_id: row.fk_owner_id ?? 0,
  }));

  return { code: 200, data: mapped };
}

export async function getClientList(ownerId: number) {
  return prisma.client.findMany({
    where: { fk_owner_id: ownerId, client_active: 'Y' },
    orderBy: { client_name: 'asc' },
    select: { client_id: true, client_name: true, client_code: true },
  });
}

export async function getPilotList(ownerId: number): Promise<{ data: PilotOption[] }> {
  const users = await prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_role: 'PIC', user_active: 'Y' },
    select: { user_id: true, first_name: true, last_name: true },
  });

  const data: PilotOption[] = users.map((u) => ({
    user_id: u.user_id,
    fullname: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    pilot_status_desc: 'ACTIVE',
  }));

  return { data };
}

export async function getEvaluationList(ownerId: number): Promise<{ data: EvaluationOption[] }> {
  const evaluations = await prisma.evaluation.findMany({
    where: { fk_owner_id: ownerId, evaluation_active: 'Y' },
    orderBy: { evaluation_name: 'asc' },
    select: { evaluation_id: true, evaluation_name: true },
  });

  const data: EvaluationOption[] = evaluations.map((e) => ({
    evaluation_id: e.evaluation_id,
    evaluation_desc: e.evaluation_name,
  }));

  return { data };
}

export async function getPlanningList(ownerId: number): Promise<{ data: PlanningOption[] }> {
  const plannings = await prisma.planning.findMany({
    where: { fk_owner_id: ownerId, planning_active: 'Y' },
    orderBy: { planning_name: 'asc' },
    select: { planning_id: true, planning_name: true },
  });

  const data: PlanningOption[] = plannings.map((p) => ({
    planning_id: p.planning_id,
    planning_desc: p.planning_name ?? '',
  }));

  return { data };
}
