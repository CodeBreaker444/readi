import { addSystem } from '@/backend/services/system/system-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const toolSchema = z.object({
  tool_code:        z.string().min(1).max(50),
  tool_name:        z.string().optional(),
  tool_description: z.string().optional().nullable(),
  tool_active:      z.string().default('Y'),
  clientId:         z.number().positive().optional().nullable(), 
  location:         z.string().optional().nullable(),
  latitude:         z.number().optional().nullable(),
  longitude:        z.number().optional().nullable(),
  activationDate:   z.string().optional().nullable(),
});
export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const body = JSON.parse(formData.get('data') as string);
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    const ownerId = session.user.ownerId;

    const toValidate = { ...body, clientId: body.fk_client_id ?? body.clientId };
    const validation = toolSchema.safeParse(toValidate);
    if (!validation.success) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const result = await addSystem({
      fk_owner_id:      ownerId,
      tool_code:        data.tool_code,
      tool_name:        data.tool_code,
      tool_description: data.tool_description,
      tool_active:      data.tool_active,
      location:         data.location,
      latitude:         data.latitude,
      longitude:        data.longitude,
      activationDate:   data.activationDate,
      clientId:         data.clientId,
      files,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ code: 0, status: 'ERROR', message: error.message }, { status: 500 });
  }
}

