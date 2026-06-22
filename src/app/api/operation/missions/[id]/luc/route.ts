import { prisma } from '@/lib/prisma';
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

    const mission = await prisma.pilot_mission.findFirst({
      where: { pilot_mission_id: missionId, fk_owner_id: session!.user.ownerId },
      select: {
        pilot_mission_id:       true,
        fk_luc_procedure_id:    true,
        luc_procedure_progress: true,
        luc_completed_at:       true,
      },
    });

    if (!mission) return NextResponse.json({ code: 0, error: 'Mission not found' }, { status: 404 });

    let procedure_steps = null;
    if (mission.fk_luc_procedure_id) {
      procedure_steps = await prisma.luc_procedure.findUnique({
        where: { procedure_id: mission.fk_luc_procedure_id },
        select: {
          procedure_id:   true,
          procedure_name: true,
          procedure_code: true,
          procedure_steps: true,
        },
      });
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

    const mission = await prisma.pilot_mission.findFirst({
      where: { pilot_mission_id: missionId, fk_owner_id: session!.user.ownerId },
      select: { luc_procedure_progress: true, fk_luc_procedure_id: true },
    });

    if (!mission) return NextResponse.json({ code: 0, error: 'Mission not found' }, { status: 404 });

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
      const proc = await prisma.luc_procedure.findUnique({
        where: { procedure_id: mission.fk_luc_procedure_id },
        select: { procedure_steps: true },
      });

      if (proc?.procedure_steps) {
        const rawTasks: any[] = Array.isArray((proc.procedure_steps as any).tasks)
          ? (proc.procedure_steps as any).tasks
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

    await prisma.pilot_mission.updateMany({
      where: { pilot_mission_id: missionId, fk_owner_id: session!.user.ownerId },
      data: {
        luc_procedure_progress: progress,
        luc_completed_at: allDone ? new Date() : null,
      },
    });

    return NextResponse.json({ code: 1, progress, all_completed: allDone });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
