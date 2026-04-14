import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { createLucProcedure, getLucProcedures } from '@/backend/services/organization/lcu-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { internalError, zodError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sector = searchParams.get('sector') ?? undefined;

        const { session, error } = await requirePermission('view_config');
        if (error) return error;

        const procedures = await getLucProcedures(session!.user.ownerId, sector);

        return NextResponse.json({
            data: procedures,
            message: 'success',
            code: 1,
            dataRows: procedures.length,
        }, { status: 200 });
    } catch (error) {
        return internalError(E.SV001, error );
    }
}

const createSchema = z.object({
    procedure_code: z.string().min(1, 'Code is required'),
    procedure_name: z.string().min(1, 'Name is required'),
    procedure_status: z.enum(['EVALUATION', 'PLANNING', 'MISSION']),
    procedure_description: z.string().optional(),
    procedure_version: z.string().optional(),
    procedure_active: z.enum(['Y', 'N']).optional(),
    procedure_sector: z.string().optional(),
    procedure_steps: z.any().optional(),
    effective_date: z.string().optional(),
    review_date: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requirePermission('view_config');
        if (error) return error;

        const body = await request.json();

        const validation = createSchema.safeParse(body);
        if (!validation.success) {
            return zodError(E.VL001, validation.error);
        }

        const created = await createLucProcedure({
            ...validation.data,
            fk_owner_id: session!.user.ownerId,
            procedure_version: validation.data.procedure_version ?? '1.0',
            procedure_active: validation.data.procedure_active ?? 'Y',
        });

        return NextResponse.json({
            data: created,
            message: 'LUC Procedure created successfully',
            code: 1,
            dataRows: 1,
        }, { status: 201 });
    } catch (error) {
        return internalError(E.SV001, error);
    }
}