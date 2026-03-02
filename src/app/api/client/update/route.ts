import { updateClient } from '@/backend/services/client/client-service';
import { getUserSession } from '@/lib/auth/server-session';
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
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }
        const body = await req.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ code: 0, error: parsed.error }, { status: 400 });
        }

        const result = await updateClient(parsed.data);
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
    }
}