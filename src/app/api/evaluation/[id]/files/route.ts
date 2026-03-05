
import { addEvaluationFile, deleteEvaluationFile, getEvaluationFiles } from '@/backend/services/planning/evaluation-service';
import { getUserSession } from '@/lib/auth/server-session';
import { buildS3Url, deleteFileFromS3, uploadFileToS3 } from '@/lib/s3Client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }

    const files = await getEvaluationFiles(Number(id), session.user.ownerId);
    return NextResponse.json({ code: 1, dataRows: files.length, data: files });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {

    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const formData = await req.formData();
    const file = formData.get('evaluation_file') as File | null;
    if (!file) {
      return NextResponse.json({ code: 0, message: 'No file provided' }, { status: 400 });
    }

 
    const clientId = z.coerce
      .number()
      .int()
      .positive()
      .safeParse(formData.get('fk_client_id'));
    const userId = z.coerce
      .number()
      .int()
      .positive()
      .safeParse(formData.get('fk_user_id') ?? '1');

    if (!clientId.success) {
      return NextResponse.json(
        { code: 0, message: 'Missing owner_id or client_id' },
        { status: 400 },
      );
    }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `evaluation/${id}/${Date.now()}_${safe}`

    await uploadFileToS3(key, file);
    const s3Url = buildS3Url(key);

    const fileSizeMB = file.size / (1024 * 1024);

    const saved = await addEvaluationFile({
      fk_owner_id: session.user.ownerId,
      fk_user_id: userId.data ?? 1,
      fk_client_id: clientId.data,
      fk_evaluation_id: Number(id),
      evaluation_file_desc: (formData.get('evaluation_file_desc') as string) ?? '',
      evaluation_file_folder: key,           
      evaluation_file_filename: file.name,
      evaluation_file_filesize: parseFloat(fileSizeMB.toFixed(2)),
      evaluation_file_ver: (formData.get('evaluation_file_ver') as string) ?? '1.0',
    });

    return NextResponse.json(
      {
        code: 1,
        message: 'File uploaded',
        dataRows: 1,
        data: saved,
        param: {
          fk_owner_id: session.user.ownerId,
          fk_evaluation_id: id,
          s3_url: s3Url,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const id = await params
      const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json();


    const { file_folder } = await deleteEvaluationFile(Number(id), session.user.ownerId);

    try {
        await deleteFileFromS3(file_folder);
    } catch {
        console.warn('S3 delete failed for key:', file_folder);
    }

    return NextResponse.json({ code: 1, message: 'File deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}