import { supabase } from '@/backend/database/database';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** GET — returns luc_procedure_progress + the linked procedure's steps (for labels) */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const missionId = Number((await params).id);
    if (!missionId) return NextResponse.json({ code: 0, error: 'Invalid ID' }, { status: 400 });

    const { data: mission, error: mErr } = await supabase
      .from('pilot_mission')
      .select('pilot_mission_id, fk_luc_procedure_id, luc_procedure_progress, luc_completed_at')
      .eq('pilot_mission_id', missionId)
      .eq('fk_owner_id', session!.user.ownerId)
      .single();

    if (mErr || !mission) return NextResponse.json({ code: 0, error: 'Mission not found' }, { status: 404 });

    let procedure_steps = null;
    if (mission.fk_luc_procedure_id) {
      const { data: proc } = await supabase
        .from('luc_procedure')
        .select('procedure_id, procedure_name, procedure_code, procedure_steps')
        .eq('procedure_id', mission.fk_luc_procedure_id)
        .single();
      procedure_steps = proc;
    }

    return NextResponse.json({
      code: 1,
      luc_procedure_progress: mission.luc_procedure_progress,
      luc_completed_at: mission.luc_completed_at,
      procedure: procedure_steps,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

/** PATCH — toggle a single task item to completed ('Y') */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const missionId = Number((await params).id);
    if (!missionId) return NextResponse.json({ code: 0, error: 'Invalid ID' }, { status: 400 });

    const { task_type, task_code, completed } = await req.json();
    if (!task_type || !task_code) {
      return NextResponse.json({ code: 0, error: 'task_type and task_code are required' }, { status: 400 });
    }

    // Fetch current progress and the linked procedure id
    const { data: mission, error: mErr } = await supabase
      .from('pilot_mission')
      .select('luc_procedure_progress, fk_luc_procedure_id')
      .eq('pilot_mission_id', missionId)
      .eq('fk_owner_id', session!.user.ownerId)
      .single();

    if (mErr || !mission) return NextResponse.json({ code: 0, error: 'Mission not found' }, { status: 404 });

    const progress: Record<string, Record<string, string>> = (mission.luc_procedure_progress as any) ?? {
      checklist: {},
      communication: {},
      assignment: {},
    };

    if (!progress[task_type]) progress[task_type] = {};
    progress[task_type][task_code] = completed ? 'Y' : 'N';

    // Check if all tasks are done by verifying every expected task code is marked 'Y'.
    // We must compare against the procedure definition — not just the progress keys —
    // because Object.values({}).every(...) is vacuously true for untouched sections.
    let allDone = false;
    if (mission.fk_luc_procedure_id) {
      const { data: proc } = await supabase
        .from('luc_procedure')
        .select('procedure_steps')
        .eq('procedure_id', mission.fk_luc_procedure_id)
        .single();

      if (proc?.procedure_steps) {
        const rawTasks: any[] = Array.isArray(proc.procedure_steps.tasks)
          ? proc.procedure_steps.tasks
          : [];
        const expectedCodes: Record<string, string[]> = {
          checklist:     rawTasks.flatMap((t: any) => (t.checklist     ?? []).map((c: any) => c.checklist_code)),
          assignment:    rawTasks.flatMap((t: any) => (t.assignment    ?? []).map((a: any) => a.assignment_code)),
          communication: rawTasks.flatMap((t: any) => (t.communication ?? []).map((c: any) => c.communication_code)),
        };
        const totalTasks = Object.values(expectedCodes).reduce((sum, codes) => sum + codes.length, 0);
        allDone = totalTasks > 0 && Object.entries(expectedCodes).every(([section, codes]) =>
          codes.every((code) => progress[section]?.[code] === 'Y'),
        );
      }
    }

    const { error: uErr } = await supabase
      .from('pilot_mission')
      .update({
        luc_procedure_progress: progress,
        luc_completed_at: allDone ? new Date().toISOString() : null,
      })
      .eq('pilot_mission_id', missionId)
      .eq('fk_owner_id', session!.user.ownerId);

    if (uErr) throw new Error(uErr.message);

    return NextResponse.json({ code: 1, progress, all_completed: allDone });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
