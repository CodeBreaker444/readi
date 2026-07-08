import { getUserFlytbaseOrganizations } from '@/backend/services/integrations/flytbase-organization-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const organizations = await getUserFlytbaseOrganizations(session!.user.userId, session!.user.ownerId);
    const transformedOrgs = organizations.map((org) => ({
      organization_id: org.id,
      org_name: org.name,
      org_id: org.org_id,
    }));
    return NextResponse.json({ success: true, organizations: transformedOrgs });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
