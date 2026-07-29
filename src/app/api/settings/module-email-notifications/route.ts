import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllModuleEmailConfigs,
  getModuleEmailConfigs,
  updateModuleEmailConfig,
  isModuleEventEmailEnabled,
} from '@/backend/services/settings/module-email-notification-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('ownerId');
    const moduleName = searchParams.get('moduleName');

    if (!ownerId) {
      return NextResponse.json(
        { error: 'ownerId is required' },
        { status: 400 }
      );
    }

    const ownerIdNum = parseInt(ownerId, 10);
    if (isNaN(ownerIdNum)) {
      return NextResponse.json(
        { error: 'Invalid ownerId' },
        { status: 400 }
      );
    }

    let configs;
    if (moduleName) {
      configs = await getModuleEmailConfigs(ownerIdNum, moduleName);
    } else {
      configs = await getAllModuleEmailConfigs(ownerIdNum);
    }

    return NextResponse.json({ data: configs });
  } catch (error: any) {
    console.error('Error fetching module email configs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch module email configs' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerId, moduleName, eventType, isEnabled, notificationRoles, notificationUserIds } = body;

    if (!ownerId || !moduleName || !eventType) {
      return NextResponse.json(
        { error: 'ownerId, moduleName, and eventType are required' },
        { status: 400 }
      );
    }

    const config = await updateModuleEmailConfig(
      parseInt(ownerId, 10),
      moduleName,
      eventType,
      {
        is_enabled: isEnabled || false,
        notification_roles: notificationRoles || [],
        notification_user_ids: notificationUserIds || [],
      }
    );

    return NextResponse.json({ data: config });
  } catch (error: any) {
    console.error('Error updating module email config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update module email config' },
      { status: 500 }
    );
  }
}
