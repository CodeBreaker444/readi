import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AddCommunicationPayload, Communication, CommunicationListResponse, DeleteCommunicationPayload } from "@/config/types/communication";

export async function fetchCommunicationList(ownerId: number): Promise<CommunicationListResponse> {
  const rows = await prisma.communication.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { communication_id: 'asc' },
  });
  return {
    code: 1,
    message: 'OK',
    dataRows: rows.length,
    data: rows as unknown as Communication[],
  };
}

export async function addCommunication(
  payload: AddCommunicationPayload,
  ownerId: number,
  userId: number,
): Promise<Communication> {
  let parsedJson: object | null = null;
  if (payload.communication_json?.trim()) {
    try {
      parsedJson = JSON.parse(payload.communication_json);
    } catch {
      throw new Error('Invalid JSON format for communication_json.');
    }
  }

  try {
    const row = await prisma.communication.create({
      data: {
        fk_user_id: userId,
        fk_owner_id: ownerId,
        communication_code: payload.communication_code,
        communication_desc: payload.communication_desc,
        communication_ver: payload.communication_ver,
        communication_active: payload.communication_active,
        communication_json: parsedJson ?? undefined,
      },
    });
    return row as unknown as Communication;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new Error(`Code "${payload.communication_code}" already exists for this owner.`);
    }
    throw e;
  }
}

export async function deleteCommunication(
  payload: DeleteCommunicationPayload,
  ownerId: number,
): Promise<{ code: number; message: string }> {
  const existing = await prisma.communication.findFirst({
    where: { communication_id: payload.communication_id, fk_owner_id: ownerId },
    select: { communication_id: true, communication_active: true },
  });
  if (!existing) return { code: 0, message: 'Communication not found.' };
  if (existing.communication_active === 'Y') {
    return { code: 0, message: 'Cannot delete an active communication. Set it to inactive first.' };
  }
  await prisma.communication.deleteMany({
    where: { communication_id: payload.communication_id, fk_owner_id: ownerId },
  });
  return { code: 1, message: 'Communication deleted successfully.' };
}

export async function updateCommunication(
  communicationId: number,
  ownerId: number,
  payload: {
    communication_code: string;
    communication_desc: string;
    communication_ver: string;
    communication_active: 'Y' | 'N';
    communication_json?: string;
  },
): Promise<{ code: number; message: string; data?: Communication }> {
  const existing = await prisma.communication.findFirst({
    where: { communication_id: communicationId, fk_owner_id: ownerId },
    select: { communication_id: true },
  });
  if (!existing) return { code: 0, message: 'Communication not found.' };

  let parsedJson: object | null = null;
  if (payload.communication_json?.trim()) {
    try {
      parsedJson = JSON.parse(payload.communication_json);
    } catch {
      return { code: 0, message: 'Invalid JSON format for communication_json.' };
    }
  }

  try {
    const row = await prisma.communication.update({
      where: { communication_id: communicationId },
      data: {
        communication_code: payload.communication_code,
        communication_desc: payload.communication_desc,
        communication_ver: payload.communication_ver,
        communication_active: payload.communication_active,
        communication_json: parsedJson ?? undefined,
      },
    });
    return { code: 1, message: 'Communication updated successfully.', data: row as unknown as Communication };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { code: 0, message: `Code "${payload.communication_code}" already exists for this owner.` };
    }
    throw new Error(`Failed to update communication: ${e instanceof Error ? e.message : String(e)}`);
  }
}