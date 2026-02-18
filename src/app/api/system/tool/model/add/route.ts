
import { addModel } from '@/backend/services/system/tool/tool-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ModelSchema = z.object({
  model_code: z.string().min(1, "Model code is required"),
  model_name: z.string().min(1, "Model name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  tool_type_id: z.string().min(1, "Tool type ID is required"),
  model_type: z.string().optional(),
  specifications: z.string().optional(),
  max_flight_time: z.number().optional(),
  max_speed: z.number().optional(),
  max_altitude: z.number().optional(),
  weight: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      factory_serie: d.model_code,
      factory_model: d.model_name,
      factory_type: d.manufacturer,
      factory_desc: d.model_type,
      technical_specs: specsJson,
      fk_tool_type_id: Number(d.tool_type_id),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Model API Error:', error);
    return NextResponse.json(
      { code: 0, message: error.message },
      { status: 500 }
    );
  }
}