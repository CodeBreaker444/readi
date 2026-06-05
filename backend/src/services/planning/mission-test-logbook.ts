import { prisma } from '@/lib/prisma';

import type {
  MissionTestCreateInput,
  MissionTestRow,
  PilotUser,
} from '@/config/types/evaluation-planning';
import { deleteFileFromS3, getPresignedDownloadUrl } from '@/lib/s3Client';


function formatUserName(user: unknown): string {
  if (!user || typeof user !== 'object') return '—';
  const u = user as {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  };
  if (u.first_name || u.last_name) {
    return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  }
  return u.username ?? '—';
}

export function buildMissionTestS3Key(
  ownerId: number,
  evaluationId: number,
  planningId: number,
  missionPlanningId: number,
  originalName: string
): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `mission_tests/${ownerId}/${evaluationId}/${planningId}/${missionPlanningId}/${Date.now()}_${safe}`;
}

export async function getMissionTestLogbookList(
  ownerId: number,
  missionPlanningId: number
): Promise<MissionTestRow[]> {
  const data = await prisma.planning_test_logbook.findMany({
    where: {
      fk_owner_id: ownerId,
      fk_mission_planning_id: missionPlanningId,
    },
    orderBy: { test_id: 'desc' },
    select: {
      test_id: true,
      fk_planning_id: true,
      fk_owner_id: true,
      fk_mission_planning_id: true,
      fk_evaluation_id: true,
      fk_pic_id: true,
      fk_observer_id: true,
      fk_user_id: true,
      test_code: true,
      test_description: true,
      test_date: true,
      test_status: true,
      test_results: true,
      tested_by_user_id: true,
      test_notes: true,
      mission_test_date_start: true,
      mission_test_date_end: true,
      mission_test_result: true,
      mission_test_folder: true,
      mission_test_filename: true,
      mission_test_filesize: true,
      mission_test_s3_key: true,
      created_at: true,
      users_planning_test_logbook_fk_pic_idTousers: {
        select: { username: true, first_name: true, last_name: true },
      },
      users_planning_test_logbook_fk_observer_idTousers: {
        select: { username: true, first_name: true, last_name: true },
      },
    },
  });

  const rows = data.map((row) => ({
    ...(row as unknown as MissionTestRow),
    pic_name: formatUserName(row.users_planning_test_logbook_fk_pic_idTousers),
    observer_name: formatUserName(row.users_planning_test_logbook_fk_observer_idTousers),
  }));

  for (const row of rows) {
    if (row.mission_test_s3_key) {
      try {
        row.document_url = await getPresignedDownloadUrl(row.mission_test_s3_key, 900);
      } catch {
        row.document_url = undefined;
      }
    }
  }

  return rows;
}

export async function addMissionTestLogbook(
  ownerId: number,
  userId: number,
  input: MissionTestCreateInput,
  fileData?: {
    s3Key: string;
    s3Url: string;
    filename: string;
    filesize: number;
  }
): Promise<MissionTestRow> {
  if (input.fk_pic_id === input.fk_observer_id) {
    throw new Error('Pilot in Command and Observer must be different users');
  }

  const data = await prisma.planning_test_logbook.create({
    data: {
      fk_planning_id: input.fk_planning_id,
      test_code: input.mission_test_code,
      test_date: input.mission_test_date_start ? new Date(input.mission_test_date_start) : null,
      test_status: input.mission_test_result === 'success' ? 'PASS' : 'FAIL',
      tested_by_user_id: input.fk_pic_id,
      test_results: {
        result: input.mission_test_result,
        pic_id: input.fk_pic_id,
        observer_id: input.fk_observer_id,
        date_start: input.mission_test_date_start,
        date_end: input.mission_test_date_end,
      },
      fk_owner_id: ownerId,
      fk_mission_planning_id: input.fk_mission_planning_id,
      fk_evaluation_id: input.fk_evaluation_id,
      fk_pic_id: input.fk_pic_id,
      fk_observer_id: input.fk_observer_id,
      fk_user_id: userId,
      mission_test_date_start: input.mission_test_date_start ? new Date(input.mission_test_date_start) : null,
      mission_test_date_end: input.mission_test_date_end ? new Date(input.mission_test_date_end) : null,
      mission_test_result: input.mission_test_result,
      ...(fileData && {
        mission_test_s3_key: fileData.s3Key,
        mission_test_s3_url: fileData.s3Url,
        mission_test_filename: fileData.filename,
        mission_test_filesize: fileData.filesize,
        mission_test_folder: fileData.s3Key,
      }),
    },
  });

  return data as unknown as MissionTestRow;
}

export async function deleteMissionTestLogbook(
  ownerId: number,
  testId: number
): Promise<void> {
  const existing = await prisma.planning_test_logbook.findFirst({
    where: { test_id: testId, fk_owner_id: ownerId },
    select: { mission_test_s3_key: true },
  });

  await prisma.planning_test_logbook.deleteMany({
    where: { test_id: testId, fk_owner_id: ownerId },
  });

  if (existing?.mission_test_s3_key) {
    try {
      await deleteFileFromS3(existing.mission_test_s3_key);
    } catch (s3Err) {
      console.error('Failed to delete S3 file:', s3Err);
    }
  }
}

export async function updateMissionPlanningActiveStatus(
  ownerId: number,
  missionPlanningId: number,
  status: 'Y' | 'N',
  userId: number
): Promise<void> {
  await prisma.planning_logbook.updateMany({
    where: { mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
    data: {
      mission_planning_active: status,
      updated_at: new Date(),
    },
  });
}

export async function getPilotUsers(ownerId: number): Promise<PilotUser[]> {
  const data = await prisma.public_users.findMany({
    where: {
      user_active: 'Y',
      fk_owner_id: ownerId,
      user_role: 'PIC',
    },
    orderBy: { first_name: 'asc' },
    select: {
      user_id: true,
      username: true,
      first_name: true,
      last_name: true,
    },
  });

  return data as unknown as PilotUser[];
}

export async function deleteMissionPlanningLogbook(
  ownerId: number,
  missionPlanningId: number
): Promise<{ deletedId: number; hadTestEntries: boolean }> {
  const existing = await prisma.planning_logbook.findFirst({
    where: { mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
    select: {
      mission_planning_id: true,
      mission_planning_code: true,
      mission_planning_folder: true,
    },
  });

  if (!existing) {
    throw new Error('Mission planning logbook entry not found or access denied');
  }

  const relatedTests = await prisma.planning_test_logbook.findMany({
    where: { fk_mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
    select: { test_id: true, mission_test_s3_key: true },
  });

  const hadTestEntries = relatedTests.length > 0;

  if (hadTestEntries) {
    for (const test of relatedTests) {
      if (test.mission_test_s3_key) {
        try {
          await deleteFileFromS3(test.mission_test_s3_key);
        } catch (s3Err) {
          console.error(`Failed to delete S3 file for test ${test.test_id}:`, s3Err);
        }
      }
    }

    await prisma.planning_test_logbook.deleteMany({
      where: { fk_mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
    });
  }

  await prisma.planning_logbook.deleteMany({
    where: { mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
  });

  return { deletedId: missionPlanningId, hadTestEntries };
}

export async function getMissionTestRepositoryFiles(
  ownerId: number,
  planningId: number
) {
  const data = await prisma.planning_test_logbook.findMany({
    where: {
      fk_owner_id: ownerId,
      fk_planning_id: planningId,
      mission_test_s3_key: { not: null },
    },
    orderBy: { created_at: 'desc' },
    select: {
      test_id: true,
      test_code: true,
      mission_test_filename: true,
      mission_test_filesize: true,
      mission_test_s3_key: true,
      mission_test_result: true,
      created_at: true,
    },
  });

  const files = [];
  for (const row of data) {
    let documentUrl = '#';
    if (row.mission_test_s3_key) {
      try {
        documentUrl = await getPresignedDownloadUrl(row.mission_test_s3_key, 900);
      } catch {
        documentUrl = '#';
      }
    }

    files.push({
      file_id: row.test_id,
      repository_filename: row.mission_test_filename ?? '',
      repository_filename_description: `Test ${row.test_code ?? ''} — ${row.mission_test_result === 'success' ? 'Positive' : 'Negative'}`,
      repository_filesize: row.mission_test_filesize ? `${row.mission_test_filesize} MB` : '',
      document_url: documentUrl,
      last_update: row.created_at ?? '',
    });
  }

  return files;
}
