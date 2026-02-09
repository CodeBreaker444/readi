import { getDashboardData } from '@/backend/src/services/dashboard';
import { getUserSession } from '@/src/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { ownerId: string } }
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

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: 'Invalid API key',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ownerId } = params;

    const dashboardData = await getDashboardData({
      owner_id: parseInt(ownerId),
      user_id: session.user.userId,
      user_timezone: body?.user_timezone || 'UTC',
      user_profile_code: body?.user_profile_code || '',
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