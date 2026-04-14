import { logEvent } from '@/backend/services/auditLog/audit-log';
import { updateClient } from '@/backend/services/client/client-service';
import { getUserSession } from '@/lib/auth/server-session';
import { internalError, unauthorized, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
    client_id: z.number().int().positive('Client ID is required'),
    client_name: z.string().min(1).max(255).optional(),
    client_legal_name: z.string().max(255).optional(),
    client_address: z.string().optional(),
    client_city: z.string().max(100).optional(),
    client_state: z.string().max(100).optional(),
    client_postal_code: z.string().max(20).optional(),
    client_phone: z.string().max(50).optional(),
    client_email: z.string().email('Invalid email').optional().or(z.literal('')),
    client_website: z.string().url('Invalid URL').optional().or(z.literal('')),
    contract_start_date: z.string().optional(),
    contract_end_date: z.string().optional(),
    payment_terms: z.string().max(100).optional(),
    credit_limit: z.number().nonnegative().optional(),
    client_active: z.enum(['Y', 'N']).optional(),
});

export async function POST(req: NextRequest) {
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

        const result = await updateClient(parsed.data);

        if (result.code === 1) {
          logEvent({
            eventType: 'UPDATE',
            entityType: 'client',
            entityId: parsed.data.client_id,
            description: `Updated client '${parsed.data.client_name ?? `#${parsed.data.client_id}`}'`,
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