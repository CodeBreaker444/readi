import { getUserProfile, updateUserProfile } from '@/backend/services/user/user-profile';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const fullname = formData.get('fullname') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const timezone = formData.get('timezone') as string;
    const avatar = formData.get('avatar') as File | null;

    const nameParts = fullname.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const userId = session.user.userId;
    const ownerId = session.user.ownerId;

    const result = await updateUserProfile(
      userId,
      ownerId,
    {
        firstName,
        lastName,
        email,
        phone,
        timezone,
    },
      avatar
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.userId;
    const ownerId = session.user.ownerId;

    const result = await getUserProfile(userId, ownerId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}