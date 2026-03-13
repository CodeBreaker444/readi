import { getDashboardData } from '@/backend/services/dashboard/dashboard';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    
    if (!session) {
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

  
    const body = await request.json();
    const { id } = await params;

    const dashboardData = await getDashboardData({
      owner_id: parseInt(id),
      user_id: session.user.userId,
      user_timezone: body?.user_timezone || 'UTC',
      user_profile_code: session.user.role || '',
    });

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 0,
        status: 'ERROR',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}