import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteClient } from '@/backend/services/client/client-service';
import { getUserSession } from '@/lib/auth/server-session';
import { internalError, unauthorized, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
    client_id: z.number().int().positive('Client ID is required'),
});

export async function DELETE(req: NextRequest) {
    try {

        const session = await getUserSession()

        if (!session) {
            return unauthorized(E.AU001);
        }
        const body = await req.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            return zodError(E.VL001, parsed.error);
        }

        const result = await deleteClient(parsed.data.client_id);

        if (result.code === 1) {
          logEvent({
            eventType: 'DELETE',
            entityType: 'client',
            entityId: parsed.data.client_id,
            description: `Deleted client #${parsed.data.client_id}`,
            userId: session.user.userId,
            userName: session.user.fullname,
            userEmail: session.user.email,
            userRole: session.user.role,
            ownerId: session.user.ownerId,
          });
        }

        return NextResponse.json(result);
    } catch (err) {
        return internalError(E.SV001, err);
    }
}