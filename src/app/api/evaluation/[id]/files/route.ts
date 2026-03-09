import {
  addEvaluationFile,
  deleteEvaluationFile,
  getEvaluationFiles
} from '@/backend/services/planning/evaluation-detail';
import { getUserSession } from '@/lib/auth/server-session';
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
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = evaluationIdParamSchema.parse(await params);

    const data = await getEvaluationFiles(session.user.ownerId, id);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: err.message ?? 'Server error' },
      { status: 500 },
    );
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
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = evaluationIdParamSchema.parse(await params);

    const formData = await req.formData();

    const validated = evaluationFileUploadSchema.parse({
      evaluation_file_desc: formData.get('evaluation_file_desc') ?? '',
      evaluation_file_ver: formData.get('evaluation_file_ver') ?? '1.0',
    });

    const file = formData.get('evaluation_file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 },
      );
    }

    const result = await addEvaluationFile(
      id,
      session.user.ownerId,
      file,
      validated.evaluation_file_desc ?? '',
      validated.evaluation_file_ver ?? '1.0',
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const { id } = evaluationIdParamSchema.parse(await params);
    const fileId = Number(req.nextUrl.searchParams.get('fileId'));

    if (!fileId || isNaN(fileId)) {
      return NextResponse.json(
        { success: false, message: 'fileId query param required' },
        { status: 400 },
      );
    }

    const result = await deleteEvaluationFile(session.user.ownerId, id, fileId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}