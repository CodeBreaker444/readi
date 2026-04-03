import { getComplianceRequirements } from '@/backend/services/compliance/compliance-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

const STATUS_COLOR: Record<string, string> = {
  COMPLIANT: '#10b981',
  PARTIAL: '#f59e0b',
  NON_COMPLIANT: '#ef4444',
  NOT_APPLICABLE: '#6b7280',
};

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    if (!ownerId) {
      return NextResponse.json({ code: 0, error: 'Owner not found in session' }, { status: 403 });
    }

    const { data } = await getComplianceRequirements({ owner_id: ownerId, limit: 200 });

    const events = data
      .filter((r) => !!r.next_review_date)
      .map((r) => ({
        id: String(r.requirement_id),
        title: `[${r.requirement_code}] ${r.requirement_title}`,
        start: r.next_review_date as string,
        end: r.next_review_date as string,
        color: STATUS_COLOR[r.requirement_status] ?? STATUS_COLOR.NOT_APPLICABLE,
        extendedProps: {
          requirement_code: r.requirement_code,
          requirement_status: r.requirement_status,
          requirement_type: r.requirement_type,
          regulatory_body: r.regulatory_body,
        },
      }));

    return NextResponse.json({ code: 1, message: 'Success', data: events });
  } catch (err) {
    console.error('[compliance/calendar] error:', err);
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}
