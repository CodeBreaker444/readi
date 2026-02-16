import { updateMissionCategory } from '@/backend/services/mission/category-service';
import { getUserSession } from '@/lib/auth/server-session';
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
        const session = await getUserSession();
        if (!session) {
            return NextResponse.json(
                { code: 0, status: 'ERROR', message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        
        const validation = updateMissionCategorySchema.safeParse(body);
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
        const { id } = await params;
        const result = await updateMissionCategory(ownerId, Number(id), {
            code: validation.data.mission_category_code,
            name: validation.data.mission_category_name,
            description: validation.data.mission_category_desc
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { code: 0, status: 'ERROR', message: error.message },
            { status: 500 }
        );
    }
}