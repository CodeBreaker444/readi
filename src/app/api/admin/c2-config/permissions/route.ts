import { logEvent } from '@/backend/services/auditLog/audit-log';
import {
  getAllUsersWithFlytbaseAccess,
  grantUserFlytbaseAccess,
  revokeUserFlytbaseAccess,
} from '@/backend/services/integrations/flytbase-organization-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const grantSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'userId must be a valid number string'),
  organizationId: z.string().regex(/^\d+$/, 'organizationId must be a valid number string'),
});

const revokeSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'userId must be a valid number string'),
  organizationId: z.string().regex(/^\d+$/, 'organizationId must be a valid number string'),
});

export async function GET() {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    const users = await getAllUsersWithFlytbaseAccess(session!.user.ownerId);
    const transformedUsers = users.map(user => ({
      id: String(user.user_id),
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      organizations: user.organizations.map(org => ({
        id: String(org.id),
        name: org.name,
        org_id: org.org_id,
      })),
    }));
    return NextResponse.json({ success: true, users: transformedUsers });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    const body = await req.json();
    const parsed = grantSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const userId = parseInt(parsed.data.userId, 10);
    const organizationId = parseInt(parsed.data.organizationId, 10);
    
    if (isNaN(userId) || isNaN(organizationId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId or organizationId' },
        { status: 400 },
      );
    }

    const access = await grantUserFlytbaseAccess(userId, organizationId);

    logEvent({
      eventType: 'CREATE',
      entityType: 'flytbase_user_access',
      description: `FlytBase access granted to user ID ${parsed.data.userId} for organization ID ${parsed.data.organizationId}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ success: true, access });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'User already has access to this organization' },
        { status: 409 },
      );
    }
    return internalError(E.SV001, err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    const body = await req.json();
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const userId = parseInt(parsed.data.userId, 10);
    const organizationId = parseInt(parsed.data.organizationId, 10);
    
    if (isNaN(userId) || isNaN(organizationId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId or organizationId' },
        { status: 400 },
      );
    }

    await revokeUserFlytbaseAccess(userId, organizationId);

    logEvent({
      eventType: 'DELETE',
      entityType: 'flytbase_user_access',
      description: `FlytBase access revoked for user ID ${parsed.data.userId} from organization ID ${parsed.data.organizationId}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
