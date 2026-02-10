import { getSPIKPIData } from '@/backend/services/dashboard/dashboard';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const SPIKPIDataSchema = z.object({
  owner_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  user_timezone: z.string().optional(),
  user_profile_code: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = SPIKPIDataSchema.parse(body);
    const result = await getSPIKPIData(validatedData);
    
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          code: 0, 
          status: 'ERROR', 
          message: 'Validation failed', 
          errors: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}