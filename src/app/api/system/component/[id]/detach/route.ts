import { logEvent } from '@/backend/services/auditLog/audit-log';
import { detachComponent } from '@/backend/services/system/system-service';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'edit');
    if (featureError) return featureError;

    const { id } = await params;
    const result = await detachComponent(session!.user.ownerId, Number(id));

    if (result.code === 1) {
      const label = result.componentCode ?? result.componentName ?? result.componentType ?? 'Unknown';
      const typeInfo = result.componentType ? ` (type: ${result.componentType})` : '';
      const childInfo = result.childrenDetached > 0 ? `, along with ${result.childrenDetached} child component(s)` : '';
      const systemInfo = result.toolCode ? ` — detached from system '${result.toolCode}'` : '';
      logEvent({
        eventType: 'UPDATE',
        entityType: 'system_component',
        description: `Moved component '${label}'${typeInfo} to Warehouse${childInfo}${systemInfo}`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
