import { deleteQualification } from '@/backend/services/user/qualification-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
   const { session, error } = await requireAuth()
     if (error) return error

    const resolvedParams = await params; 
    
    const { id } = paramsSchema.parse(resolvedParams);

    await deleteQualification(id, session!.user.ownerId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}