
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addModel } from '@/backend/services/system/system-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ModelSchema = z.object({
  model_code: z.string().min(1, "Model code is required"),
  model_name: z.string().min(1, "Model name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  model_type: z.string().optional(),
  specifications: z.string().optional(),
  max_flight_time: z.number().optional(),
  max_speed: z.number().optional(),
  max_altitude: z.number().optional(),
  weight: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
      const { session, error } = await requirePermission('view_config');
      if (error) return error;

    const body = await req.json();
    const validation = ModelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          code: 0,
          message: 'Validation failed',
          errors: validation.error,
        },
        { status: 400 }
      );
    }

    const d = validation.data;

    const specsJson = {
      max_flight_time: d.max_flight_time,
      max_speed: d.max_speed,
      max_altitude: d.max_altitude,
      weight: d.weight,
      notes: d.specifications,
    };

    const result = await addModel({
      fk_owner_id: session!.user.ownerId,
      factory_serie: d.model_code,
      factory_model: d.model_name,
      factory_type: d.manufacturer,
      factory_desc: d.model_type,
      technical_specs: specsJson,
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'system',
        description: `Created system model '${d.model_name}' (${d.model_code})`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Model API Error:', error);
    return NextResponse.json(
      { code: 0, message: error.message },
      { status: 500 }
    );
  }
}