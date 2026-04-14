import {
  addEvaluationFile,
  deleteEvaluationFile,
  getEvaluationFiles
} from '@/backend/services/planning/evaluation-detail';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const evaluationIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid evaluation ID'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;
    const { id } = evaluationIdParamSchema.parse(await params);

    const data = await getEvaluationFiles(session!.user.ownerId, id);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return zodError(E.VL001, err);
    }
    return internalError(E.SV001, err);
  }
}

const evaluationFileUploadSchema = z.object({
  evaluation_file_desc: z.string().max(255).optional().default(''),
  evaluation_file_ver: z.string().max(50).optional().default('1.0'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;
    const { id } = evaluationIdParamSchema.parse(await params);

    const formData = await req.formData();

    const validated = evaluationFileUploadSchema.parse({
      evaluation_file_desc: formData.get('evaluation_file_desc') ?? '',
      evaluation_file_ver: formData.get('evaluation_file_ver') ?? '1.0',
    });

    const file = formData.get('evaluation_file') as File | null;
    if (!file || !(file instanceof File)) {
      return apiError(E.UP004, 400);
    }

    const result = await addEvaluationFile(
      id,
      session!.user.ownerId,
      file,
      validated.evaluation_file_desc ?? '',
      validated.evaluation_file_ver ?? '1.0',
    );

    if (!result.success) {
      return apiError(E.SV002, 422);
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return zodError(E.VL001, err);
    }
    return internalError(E.SV001, err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;
    const { id } = evaluationIdParamSchema.parse(await params);
    const fileId = Number(req.nextUrl.searchParams.get('fileId'));

    if (!fileId || isNaN(fileId)) {
      return apiError(E.VL004, 400);
    }

    const result = await deleteEvaluationFile(session!.user.ownerId, id, fileId);

    if (!result.success) {
      return apiError(E.SV002, 422);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return zodError(E.VL001, err);
    }
    return internalError(E.SV001, err);
  }
}
