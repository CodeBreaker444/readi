import { logEvent } from '@/backend/services/auditLog/audit-log';
import {
  getUserFlytbaseOrganizations,
  revokeUserFlytbaseAccess,
} from '@/backend/services/integrations/flytbase-organization-service';
import {
  hasFlytbaseToken,
  removeFlytbaseToken,
  saveFlytbaseConfig,
  verifyFlytbaseTokenAndGetUser,
} from '@/backend/services/integrations/flytbase-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const saveSchema = z.object({
  user_id: z.number().int().positive(),
  token: z.string().min(8, 'Token too short').max(2048, 'Token too long'),
  orgId: z.string().min(4, 'Org ID too short').max(128, 'Org ID too long'),
  tokenName: z.string().max(100, 'Name too long').optional(),
});

const deleteSchema = z.object({
  user_id: z.number().int().positive(),
  // When present, only this organization's access is revoked (user_flytbase_access row).
  organization_id: z.number().int().positive().optional(),
});

const ORG_REVOKE_ROLES = ['SUPERADMIN', 'ADMIN', 'OPM'];

export async function GET(req: NextRequest) {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    const userId = parseInt(req.nextUrl.searchParams.get('user_id') ?? '');
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'user_id is required' }, { status: 400 });
    }

    const { exists, tokenName } = await hasFlytbaseToken(userId);
    const orgs = await getUserFlytbaseOrganizations(userId, session!.user.ownerId);
    const organizations = orgs.map((o) => ({ id: o.id, name: o.name, org_id: o.org_id }));
    return NextResponse.json({ success: true, hasToken: exists, tokenName, organizations });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('manage_users');
    if (error) return error;

    const body = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const flytbaseUser = await verifyFlytbaseTokenAndGetUser(
      parsed.data.token,
      parsed.data.orgId,
    );

    await saveFlytbaseConfig(
      parsed.data.user_id,
      parsed.data.token,
      parsed.data.orgId,
      parsed.data.tokenName,
    );

    return NextResponse.json({ success: true, flytbaseUser });
  } catch (err: any) {
    if (err?.message?.includes('Invalid') || err?.message?.includes('verify')) {
      return NextResponse.json({ success: false, message: err.message }, { status: 422 });
    }
    return internalError(E.SV001, err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    if (parsed.data.organization_id !== undefined) {
      if (!ORG_REVOKE_ROLES.includes(session!.user.role)) {
        return NextResponse.json({ success: false, message: 'Not allowed' }, { status: 403 });
      }
      // Only orgs in the caller's own company that the user actually has can be revoked.
      const assigned = await getUserFlytbaseOrganizations(parsed.data.user_id, session!.user.ownerId);
      if (!assigned.some((o) => o.id === parsed.data.organization_id)) {
        return NextResponse.json({ success: false, message: 'Organization not assigned to user' }, { status: 404 });
      }
      await revokeUserFlytbaseAccess(parsed.data.user_id, parsed.data.organization_id);

      const targetUser = await prisma.public_users.findUnique({
        where: { user_id: parsed.data.user_id },
        select: { email: true },
      });
      const orgName = assigned.find((o) => o.id === parsed.data.organization_id)?.name;

      logEvent({
        eventType: 'DELETE',
        entityType: 'flytbase_user_access',
        description: `FlytBase access revoked for ${targetUser?.email ?? `user ID ${parsed.data.user_id}`} from organization ${orgName ?? `ID ${parsed.data.organization_id}`}`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });
      return NextResponse.json({ success: true });
    }

    await removeFlytbaseToken(parsed.data.user_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
