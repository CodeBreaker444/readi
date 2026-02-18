import { addTool } from '@/backend/services/system/tool/tool-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const toolSchema = z.object({
  tool_code: z.string().min(1, 'Tool code is required').max(50),
  tool_serial_number: z.string().min(1, 'Serial number is required').max(100),
  tool_name: z.string().optional(),
  tool_description: z.string().optional().nullable(),
  tool_active: z.string().default('Y'),
  fk_model_id: z.number().optional().nullable(),
  fk_client_id: z.number().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.number().optional().nullable(),
  warranty_expiry: z.string().optional().nullable(),
  last_calibration_date: z.string().optional().nullable(),
  next_calibration_date: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  ccPlatform: z.string().optional().nullable(),
  gcsType: z.string().optional().nullable(),
  streamingType: z.string().optional().nullable(),
  streamingUrl: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  guaranteeDays: z.number().optional().nullable(),
  activationDate: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
       if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ownerId = session.user.ownerId;

    const validation = toolSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Validation failed',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const result = await addTool({
      fk_owner_id: ownerId,
      tool_code: data.tool_code,
      tool_serial_number: data.tool_serial_number,
      tool_name: data.tool_name || data.tool_code,
      tool_description: data.tool_description,
      tool_active: data.tool_active,
      fk_model_id: data.fk_model_id,
      fk_client_id: data.fk_client_id,
      assigned_client_id: data.fk_client_id,
      purchase_date: data.purchase_date,
      purchase_price: data.purchase_price,
      warranty_expiry: data.warranty_expiry,
      last_calibration_date: data.last_calibration_date,
      next_calibration_date: data.next_calibration_date,
      location: data.location,
      ccPlatform: data.ccPlatform,
      gcsType: data.gcsType,
      streamingType: data.streamingType,
      streamingUrl: data.streamingUrl,
      vendor: data.vendor,
      latitude: data.latitude,
      longitude: data.longitude,
      guaranteeDays: data.guaranteeDays,
      activationDate: data.activationDate,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}