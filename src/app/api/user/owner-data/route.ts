import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const owner = await prisma.owner.findUnique({
      where: { owner_id: session.user.ownerId },
      select: { 
        owner_id: true,
        email_notifications_enabled: true,
      },
    });

    if (!owner) {
      return NextResponse.json(
        { error: 'Owner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ownerId: owner.owner_id,
      emailNotificationsEnabled: owner.email_notifications_enabled,
    });
  } catch (error: any) {
    console.error('Error fetching owner data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch owner data' },
      { status: 500 }
    );
  }
}
