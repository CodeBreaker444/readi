import { createNewEvaluationRequest } from '@/backend/services/planning/evaluation';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';

const evaluationSchema = z.object({
  client_id: z.number().min(1, 'Please select a client'),
  fk_luc_procedure_id: z.number().min(1, 'Please select a Procedure'),
  evaluation_status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED', 'DONE']),
  evaluation_request_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  evaluation_year: z.number().int().min(2000).max(2100),
  evaluation_description: z.string().min(4, 'Description must be at least 4 characters'),
  evaluation_offer: z.string().optional().or(z.literal('')),
  evaluation_sale_manager: z.string().optional().or(z.literal('')),
  areas: z.array(
    z.object({
      type: z.string(),
      area_sqm: z.number(),
      center_lat: z.number(),
      center_lng: z.number(),
      geojson: z.any(),
    }),
  ),
});

export type EvaluationFormData = z.infer<typeof evaluationSchema>;

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const body = await request.json();
    const ownerId = session!.user.ownerId;
    const userId = session!.user.userId;

    const validation = evaluationSchema.safeParse(body.data);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation Failed',
          details: validation.error.format(),
        },
        { status: 400 },
      );
    }

    const result = await createNewEvaluationRequest(ownerId, userId, validation.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}