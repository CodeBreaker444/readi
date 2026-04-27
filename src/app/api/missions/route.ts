import { createFlightRequest, flightRequestExists } from '@/backend/services/mission/flight-request-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireApiKey } from '@/lib/auth/api-key-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const LocalizationSchema = z.object({
  type:        z.string(),
  highway:     z.string().optional(),
  carriageway: z.string().optional(),
  kmStart:     z.number().optional(),
  kmEnd:       z.number().optional(),
}).catchall(z.unknown());

const WaypointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.array(z.number()).min(2).max(3),
});

const MissionItemSchema = z.object({
  missionId:     z.string().min(1, 'missionId is required'),
  startDateTime: z.string().optional(),
});

// New batch format: PMVD sends a list of pre-generated mission IDs with their scheduled times
const BatchMissionSchema = z.object({
  type:          z.string().optional(),
  target:        z.string().optional(),
  user_timezone: z.string().optional(),
  localization:  LocalizationSchema.optional(),
  waypoint:      WaypointSchema.optional(),
  missions:      z.array(MissionItemSchema).min(1, 'missions array must not be empty'),
  priority:      z.string().optional(),
  notes:         z.string().optional(),
  operator:      z.string().optional(),
});

// Legacy single-mission format 
const SingleMissionSchema = z.object({
  missionId:     z.string().min(1, 'missionId is required'),
  type:          z.string().optional(),
  target:        z.string().optional(),
  localization:  LocalizationSchema.optional(),
  waypoint:      WaypointSchema.optional(),
  startDateTime: z.string().optional(),
  priority:      z.string().optional(),
  notes:         z.string().optional(),
  operator:      z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireApiKey(req);
    if (error) return error;

    const body = await req.json();

    // Detect new batch format  
    if (Array.isArray(body.missions)) {
      const parsed = BatchMissionSchema.safeParse(body);
      if (!parsed.success) return zodError(E.VL001, parsed.error);

      const { type, target, localization, waypoint, priority, notes, operator } = parsed.data;
      const created: Array<{ missionId: string; dcc_status: string }> = [];

      for (const item of parsed.data.missions) {
        if (await flightRequestExists(item.missionId, session!.owner_id)) {
          return NextResponse.json(
            {
              code: 0,
              status: 'ERROR',
              message: `Mission ID '${item.missionId}' already exists`,
              created,
            },
            { status: 409 },
          );
        }

        await createFlightRequest({
          owner_id:            session!.owner_id,
          api_key_id:          session!.api_key_id,
          external_mission_id: item.missionId,
          mission_type:        type,
          target,
          localization:        localization as Record<string, unknown> | undefined,
          waypoint:            waypoint as Record<string, unknown> | undefined,
          start_datetime:      item.startDateTime,
          priority,
          notes,
          operator,
        });

        created.push({ missionId: item.missionId, dcc_status: 'NEW' });
      }

      return NextResponse.json({
        code:      1,
        status:    'SUCCESS',
        message:   'Mission requests received',
        missions:  created,
        timestamp: Math.floor(Date.now() / 1000),
        dataRows:  created.length,
      });
    }

    // Legacy single-mission format
    const parsed = SingleMissionSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const {
      missionId, type, target, localization,
      waypoint, startDateTime, priority, notes, operator,
    } = parsed.data;

    if (await flightRequestExists(missionId, session!.owner_id)) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: `Mission ID '${missionId}' already exists` },
        { status: 409 },
      );
    }

    await createFlightRequest({
      owner_id:            session!.owner_id,
      api_key_id:          session!.api_key_id,
      external_mission_id: missionId,
      mission_type:        type,
      target,
      localization:        localization as Record<string, unknown> | undefined,
      waypoint:            waypoint as Record<string, unknown> | undefined,
      start_datetime:      startDateTime,
      priority,
      notes,
      operator,
    });

    return NextResponse.json({
      code:       1,
      status:     'SUCCESS',
      message:    'Mission request received',
      missionId,
      dcc_status: 'NEW',
      timestamp:  Math.floor(Date.now() / 1000),
      dataRows:   1,
    });
  } catch (err) {
    console.error('[POST /api/missions]', err);
    return internalError(E.SV001, err);
  }
}
