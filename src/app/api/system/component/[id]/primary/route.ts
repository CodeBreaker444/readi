import { supabase } from '@/backend/database/database';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ is_primary: z.boolean() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ code: 0, message: 'Invalid data' }, { status: 400 });

    const { data: existing } = await supabase
      .from('tool_component')
      .select('component_metadata')
      .eq('component_id', Number(id))
      .single();

    const updatedMeta = { ...(existing?.component_metadata || {}), is_primary: parsed.data.is_primary };

    const { error: updateError } = await supabase
      .from('tool_component')
      .update({ component_metadata: updatedMeta })
      .eq('component_id', Number(id));

    if (updateError) throw updateError;

    return NextResponse.json({ code: 1, message: 'Primary flag updated' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
