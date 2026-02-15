import { updateMissionType } from '@/backend/services/mission/missionType';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
const updateMissionTypeSchema = z.object({
  mission_type_name: z.string().min(1, 'Mission type name is required'),
  mission_type_desc: z.string().optional(),
  mission_type_code: z.string().min(1, 'Mission type code is required'),
  mission_type_label: z.string().optional(),
}); 
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validation = updateMissionTypeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          code: 0, 
          status: 'ERROR', 
          message: 'Validation failed',
          errors: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const missionTypeId = parseInt(params.id);
    const ownerId = session.user.ownerId;

    const result = await updateMissionType(ownerId, missionTypeId, {
      mission_type_name: body.mission_type_name,
      mission_type_desc: body.mission_type_desc,
      mission_type_code: body.mission_type_code,
      mission_type_label: body.mission_type_label,
      fk_owner_id: ownerId
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}