import { importCategories, importClinets, importDrones, importPilots, importPlans, importStatus, importTypes } from '@/backend/services/operation/importOperation-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownerId: number = session.user.ownerId
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const clientId = Number(searchParams.get('client_id')) || 0;
    const vehicleId = Number(searchParams.get('vehicle_id')) || 0;

    switch (type) {
      case 'clients': {
      const data = await importClinets(ownerId)
        return NextResponse.json({ clients: data });
      }

      case 'drones': {
        const data = await importDrones(ownerId)
        return NextResponse.json({ drones: data });
      }

      case 'plans': {
       const data = await importPlans(ownerId, clientId, vehicleId)
        return NextResponse.json({ plans: data });
      }

      case 'categories': {
       const data = await importCategories(ownerId)
        return NextResponse.json({
          categories: (data ?? []).map((r: any) => ({ id: r.category_id, name: r.category_name })),
        });
      }

      case 'types': {
      const data = await importTypes(ownerId)
        return NextResponse.json({
          types: (data ?? []).map((r: any) => ({ id: r.mission_type_id, name: r.type_name })),
        });
      }

      case 'statuses': {
       const data = await importStatus(ownerId)
        return NextResponse.json({
          statuses: (data ?? []).map((r: any) => ({ id: r.status_id, name: r.status_name })),
        });
      }

      case 'results': {
        const results = [
          { id: 1, name: 'SUCCESS' },
          { id: 2, name: 'PARTIAL' },
          { id: 3, name: 'FAILED' },
          { id: 4, name: 'ABORTED' },
        ];
        return NextResponse.json({ results });
      }

      case 'pilots': {
       const data = await importPilots(ownerId)
        return NextResponse.json({ pilots: data });
      }

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[GET /api/operation/import/options]', err);
    return NextResponse.json({ error: err?.message ?? 'Error' }, { status: 500 });
  }
}