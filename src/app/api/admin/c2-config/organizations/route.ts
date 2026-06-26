import { logEvent } from '@/backend/services/auditLog/audit-log';
import {
  createFlytbaseOrganization,
  deleteFlytbaseOrganization,
  getAllFlytbaseOrganizations,
  updateFlytbaseOrganization,
} from '@/backend/services/integrations/flytbase-organization-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  orgId: z.string().min(4, 'Org ID too short').max(255, 'Org ID too long'),
  apiToken: z.string().min(8, 'Token too short').max(2048, 'Token too long'),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  orgId: z.string().min(4, 'Org ID too short').max(255, 'Org ID too long').optional(),
  apiToken: z.string().min(8, 'Token too short').max(2048, 'Token too long').optional(),
});

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

export async function GET() {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    const organizations = await getAllFlytbaseOrganizations(session!.user.ownerId);
    const transformedOrgs = organizations.map(org => ({
      id: String(org.id),
      org_id: org.org_id,
      name: org.name,
    }));
    return NextResponse.json({ success: true, organizations: transformedOrgs });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    if (!session!.user.ownerId || session!.user.ownerId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid user session: missing or invalid owner ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const organization = await createFlytbaseOrganization(
      parsed.data.name,
      parsed.data.orgId,
      parsed.data.apiToken,
      session!.user.ownerId,
    );

    logEvent({
      eventType: 'CREATE',
      entityType: 'flytbase_organization',
      description: `FlytBase organization "${parsed.data.name}" created`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ success: true, organization });
  } catch (err: any) {
    if (err?.message?.includes('Invalid') || err?.message?.includes('verify')) {
      return NextResponse.json({ success: false, message: err.message }, { status: 422 });
    }
    return internalError(E.SV001, err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error, session } = await requirePermission('manage_users');
    if (error) return error;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const organization = await updateFlytbaseOrganization(
      parsed.data.id,
      parsed.data.name,
      parsed.data.orgId,
      parsed.data.apiToken,
    );

    logEvent({
      eventType: 'UPDATE',
      entityType: 'flytbase_organization',
      description: `FlytBase organization ID ${parsed.data.id} updated`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ success: true, organization });
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

    await deleteFlytbaseOrganization(parsed.data.id);

    logEvent({
      eventType: 'DELETE',
      entityType: 'flytbase_organization',
      description: `FlytBase organization ID ${parsed.data.id} deleted`,
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
