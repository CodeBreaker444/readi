import { updateMissionType } from '@/backend/services/mission/mission-type';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const UpdateMissionTypeSchema = z.object({
  mission_type_name: z.string().min(1, 'Mission type name is required'),
  mission_type_code: z.string().min(1, 'Mission type code is required'),
  mission_type_label: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { typeId } = await params;
    const id = Number(typeId);
    if (!Number.isInteger(id) || id <= 0) return apiError(E.VL002, 400);

    const body = await request.json();
    const parsed = UpdateMissionTypeSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const ownerId = session!.user.ownerId;
    const result = await updateMissionType(ownerId, id, parsed.data);

    return NextResponse.json(result);
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Mission type code already exists') return apiError(E.BL001, 409);
    return internalError(E.SV001, err);
  }
}
