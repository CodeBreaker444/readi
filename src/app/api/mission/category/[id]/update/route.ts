import { logEvent } from '@/backend/services/auditLog/audit-log';
import { updateMissionCategory } from '@/backend/services/mission/category-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const updateMissionCategorySchema = z.object({
  mission_category_code: z.string().min(1, 'Category code is required'),
  mission_category_name: z.string().min(1, 'Category name is required'),
  mission_category_desc: z.string().min(1, 'Category description is required'),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
         const { session, error } = await requirePermission('view_config')
     if (error) return error;

        const body = await request.json();

        const validation = updateMissionCategorySchema.safeParse(body);
        if (!validation.success) {
            return zodError(E.VL001, validation.error);
        }

        const ownerId = session!.user.ownerId;
        const { id } = await params;
        const result = await updateMissionCategory(ownerId, Number(id), {
            code: validation.data.mission_category_code,
            name: validation.data.mission_category_name,
            description: validation.data.mission_category_desc
        });

        if (result.code === 1) {
          logEvent({
            eventType: 'UPDATE',
            entityType: 'mission_category',
            entityId: id,
            description: `Updated mission category '${validation.data.mission_category_name}' (${validation.data.mission_category_code})`,
            userId: session!.user.userId,
            userName: session!.user.fullname,
            userEmail: session!.user.email,
            userRole: session!.user.role,
            ownerId,
          });
        }

        return NextResponse.json(result);
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
