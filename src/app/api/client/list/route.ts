import { listClients } from '@/backend/services/client/client-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
   
    if(!session)
    {
      return NextResponse.json({message:"Unauthorized"},{status:401})
    }

    const result = await listClients(session.user.ownerId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}