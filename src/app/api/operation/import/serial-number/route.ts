import { parseGutmaFlightData } from '@/backend/services/integrations/gutma-parser';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const formData = await req.formData();
    const logFile = formData.get('logFile') as File | null;

    if (!logFile) {
      return NextResponse.json({ error: 'No log file provided' }, { status: 400 });
    }

    const buffer = await logFile.arrayBuffer();
    const ext = logFile.name.split('.').pop()?.toLowerCase();

    if (ext !== 'gutma') {
      return NextResponse.json({ error: 'Only .gutma files are supported' }, { status: 400 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(new TextDecoder().decode(buffer));
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse JSON' }, { status: 400 });
    }

    const gutma = parseGutmaFlightData(parsed);
    
    // Extract serial number from the correct path: exchange.message.flight_data.aircraft.serial_number
    const serialNumber = typeof gutma.aircraft?.serial_number === 'string'
      ? gutma.aircraft.serial_number.trim() || null
      : null;

    return NextResponse.json({ serialNumber });
  } catch (err) {
    console.error('[POST /api/operation/import/serial-number]', err);
    return internalError(E.SV001, err);
  }
}
