import { deleteLucProcedure, getLucProcedureById, updateLucProcedure } from '@/backend/services/organization/lcu-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, notFound } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const procedure = await getLucProcedureById(Number(id));
    if (!procedure) {
      return notFound(E.NF018);
    }

    return NextResponse.json({ code: 1, message: 'success', data: procedure, dataRows: 1 });
  } catch (error) {
    return internalError(E.SV001, error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await request.json();
    const updated = await updateLucProcedure({ ...body, procedure_id: Number(id) });

    return NextResponse.json( 
      { code: 1, message: 'Updated successfully', data: updated, dataRows: 1 },
      { status: 200 }
    );
  } catch (error) {
    return internalError(E.SV001, error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    await deleteLucProcedure(Number(id));

    return NextResponse.json(
      { data: null, message: 'Deleted successfully', code: 1, dataRows: 0 },
      { status: 200 }
    );
  } catch (error) {
    return internalError(E.SV001, error);
  }
}