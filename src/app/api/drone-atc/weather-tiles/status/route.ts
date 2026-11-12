import { requireAuth } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';
import { getLatestWeatherUpdate } from '@/backend/services/weather/weather-tile-cache';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const updatedAt = await getLatestWeatherUpdate();
  return NextResponse.json({ updatedAt: updatedAt?.toISOString() ?? null });
}
