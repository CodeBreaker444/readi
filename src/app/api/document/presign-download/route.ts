import { getRevisionDownloadUrl } from '@/backend/services/document/document-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { E } from '@/lib/error-codes';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_repository');
    if (error) return error;

    const body = await req.json();
    const parsed = z.object({ rev_id: z.number().int().positive() }).safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }   
    const result = await getRevisionDownloadUrl({ rev_id: parsed.data.rev_id });
    return NextResponse.json({ code: 1, ...result });
  } catch (error: any) {
    console.error('[presign_download]', error);
    return internalError(E.AU002, error);
  }
}
