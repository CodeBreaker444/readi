import { importMissionFromLog } from '@/backend/services/operation/importOperation-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }

    const ownerId = session.user.ownerId;
    const formData = await req.formData();

    const file = formData.get('mission_file_log') as File | null;
    if (!file) {
      return NextResponse.json({ code: 0, message: 'No file received' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['gutma', 'zip'].includes(ext ?? '')) {
      return NextResponse.json(
        { code: 0, message: `Invalid file type: .${ext}. Only .gutma or .zip allowed.` },
        { status: 400 }
      );
    }

    const params = {
      ownerId,
      clientId:   Number(formData.get('client_id'))           || 0,
      platform:   String(formData.get('mission_ccPlatform')   ?? 'FLYTBASE'),
      vehicleId:  Number(formData.get('mission_vehicle'))      || 0,
      categoryId: Number(formData.get('mission_category'))     || 0,
      typeId:     Number(formData.get('mission_type'))         || 0,
      planId:     formData.get('mission_plan') === 'N'
                    ? null : Number(formData.get('mission_plan')) || null,
      statusId:   Number(formData.get('mission_status'))       || 0,   
      resultId:   Number(formData.get('mission_result'))       || 0,
      pilotId:    Number(formData.get('pilot_id'))             || 0,
      location:   String(formData.get('mission_location')     ?? ''),  
      groupLabel: String(formData.get('mission_group_label')  ?? ''),
      notes:      String(formData.get('mission_notes')        ?? ''),
    };

    const result = await importMissionFromLog(file, params);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      newMissionIds: result.newMissionIds,
      operations:    result.operations,
      skipped:       result.skipped,      
    });
  } catch (err: any) {
    console.error('[POST /api/operation/import]', err?.message);
    return NextResponse.json(
      { code: 0, message: err?.message ?? 'Import failed' },
      { status: 500 }
    );
  }
}