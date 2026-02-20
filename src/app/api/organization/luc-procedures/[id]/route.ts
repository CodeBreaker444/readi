import { deleteLucProcedure, getLucProcedureById, updateLucProcedure } from '@/backend/services/organization/lcu-procedures/lcu-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getUserSession();

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized', code: 0, data: null, dataRows: 0 }, { status: 401 });
    }

    const procedure = await getLucProcedureById(Number(id));
    if (!procedure) {
      return NextResponse.json(
        { message: 'LUC Procedure not found', code: 0, data: null, dataRows: 0 },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: procedure, message: 'success', code: 1, dataRows: 1 },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ message, code: 0, data: null, dataRows: 0 }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;   
    const session = await getUserSession();

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized', code: 0, data: null, dataRows: 0 }, { status: 401 });
    }

    const body = await request.json();
    const updated = await updateLucProcedure({ ...body, procedure_id: Number(id) });

    return NextResponse.json(
      { data: updated, message: 'Updated successfully', code: 1, dataRows: 1 },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ message, code: 0, data: null, dataRows: 0 }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getUserSession();

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized', code: 0, data: null, dataRows: 0 }, { status: 401 });
    }

    await deleteLucProcedure(Number(id));

    return NextResponse.json(
      { data: null, message: 'Deleted successfully', code: 1, dataRows: 0 },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ message, code: 0, data: null, dataRows: 0 }, { status: 500 });
  }
}