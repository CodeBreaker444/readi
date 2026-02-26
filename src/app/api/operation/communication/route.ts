import { sendGeneralCommunication } from '@/backend/services/operation/communication-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
      const session = await getUserSession()
    if (!session?.user) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }

    const ownerId: number  = session.user.ownerId
    const userId: number   = session.user.userId
    const userEmail: string = session.user.email

    const formData = await req.formData();

    const rawTo = formData.getAll('communication_to[]');
    const communicationTo = rawTo.map((v) => Number(v)).filter(Boolean);

    const file = formData.get('communication_file') as File | null;

    const params = {
      ownerId,
      userId,
      userEmail,
      procedureName:    String(formData.get('procedure_name')       ?? 'operation'),
      fkEvaluationId:   Number(formData.get('fk_evaluation_id'))     || 0,
      fkPlanningId:     Number(formData.get('fk_planning_id'))       || 0,
      fkMissionId:      Number(formData.get('fk_mission_id'))        || 0,
      fkVehicleId:      Number(formData.get('fk_vehicle_id'))        || 0,
      fkClientId:       Number(formData.get('fk_client_id'))         || 0,
      communicationLevel:   String(formData.get('communication_level')   ?? 'info'),
      communicationMessage: String(formData.get('communication_message') ?? ''),
      communicationTo,
      file: file?.size ? file : null,
    };

    if (!params.communicationMessage.trim()) {
      return NextResponse.json({ code: 0, message: 'Message is required' }, { status: 400 });
    }
    if (communicationTo.length === 0) {
      return NextResponse.json({ code: 0, message: 'At least one recipient is required' }, { status: 400 });
    }

    const result = await sendGeneralCommunication(params);

    return NextResponse.json({ code: 1, message: 'Sent', newId: result.newId });
  } catch (err: any) {
    console.error('[POST /api/operation/communication]', err);
    return NextResponse.json(
      { code: 0, message: err?.message ?? 'Failed to send communication' },
      { status: 500 }
    );
  }
}