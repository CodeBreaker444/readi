import { addReport } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const addReportSchema = z.object({
  ticket_id: z.coerce.number(), 
  report_text: z.string().min(1, "Report text is required"),
  work_start: z.string().optional(),
  work_end: z.string().optional(),
  report_by: z.string().optional(),
  close_report: z.enum(['Y']).optional(), 
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getUserSession();

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const validation = addReportSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        code: 0,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    await addReport({
      ticket_id: validation.data.ticket_id,
      report_text: validation.data.report_text,
      work_start: validation.data.work_start,
      work_end: validation.data.work_end,
      report_by: validation.data.report_by ?? 'web',
      close_report: validation.data.close_report,  
    });

    return NextResponse.json({ status: 'OK' });
  } catch (err: any) {
    console.error('[POST /api/maintenance/tickets/report]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}