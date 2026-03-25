import { addReport, uploadAttachment } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
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

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
       const { session, error } = await requirePermission('view_config');
       if (error) return error;

    const formData = await req.formData();

    const validation = addReportSchema.safeParse({
      ticket_id:    formData.get('ticket_id'),
      report_text:  formData.get('report_text'),
      work_start:   formData.get('work_start') || undefined,
      work_end:     formData.get('work_end') || undefined,
      report_by:    formData.get('report_by') || undefined,
      close_report: formData.get('close_report') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json({
        code: 0,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    await addReport({
      ticket_id:    validation.data.ticket_id,
      report_text:  validation.data.report_text,
      work_start:   validation.data.work_start,
      work_end:     validation.data.work_end,
      report_by:    validation.data.report_by ?? 'web',
      close_report: validation.data.close_report,
    });

    const file = formData.get('file');
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ status: 'ERROR', message: 'File exceeds 10 MB limit' }, { status: 413 });
      }
      await uploadAttachment(
        validation.data.ticket_id,
        file,
        'Intervention report attachment',
        validation.data.report_by ?? 'web',
        session!.user.userId,
      );
    }

    return NextResponse.json({ status: 'OK' });
  } catch (err: any) {
    console.error('[POST /api/maintenance/tickets/report]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}
