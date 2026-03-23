import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addMissionCategory } from '@/backend/services/mission/category-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const missionCategorySchema = z.object({
  mission_category_code: z.string().min(1, 'Category code is required').max(50, 'Code too long'),
  mission_category_name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
  mission_category_desc: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validation = missionCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          code: 0, 
          status: 'ERROR', 
          message: 'Validation failed',
          errors: validation.error 
        },
        { status: 400 }
      );
    }

    const ownerId = session.user.ownerId;
    const result = await addMissionCategory(ownerId, {
      code: validation.data.mission_category_code,
      name: validation.data.mission_category_name,
      description: validation.data.mission_category_desc
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'mission_category',
        description: `Created mission category '${validation.data.mission_category_name}' (${validation.data.mission_category_code})`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}