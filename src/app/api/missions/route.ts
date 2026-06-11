import {
  createFlightRequest,
  deleteFlightRequest,
  flightRequestExists,
  getFlightRequestsByExternalIds,
  updateFlightRequestStatus,
} from '@/backend/services/mission/flight-request-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireApiKey } from '@/lib/auth/api-key-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const LocalizationSchema = z.object({
  type:        z.string().min(1, 'type is required'),
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
  waypoint:      WaypointSchema,
});

// New batch format: PMVD sends a list of pre-generated mission IDs with their scheduled times
const BatchMissionSchema = z.object({
  type:          z.string().optional(),
  target:        z.string().optional(),
  user_timezone: z.string().optional(),
  localization:  LocalizationSchema.optional(),
  missions:      z.array(MissionItemSchema).min(1, 'missions array must not be empty').max(10, 'Maximum 10 missions can be created per request'),
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
  waypoint:      WaypointSchema.required(),
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

      const { type, target, localization, priority, notes, operator } = parsed.data;
      const missionItems = parsed.data.missions;

      // Pre-check all IDs for duplicates before creating anything
      for (const item of missionItems) {
        if (await flightRequestExists(item.missionId, session!.owner_id)) {
          return NextResponse.json(
            {
              code: 0,
              status: 'ERROR',
              message: `Mission ID '${item.missionId}' already exists. No missions were created.`,
            },
            { status: 409 },
          );
        }
      }

      // Create sequentially — rollback all on any DB error
      const created: Array<{ missionId: string; dcc_status: string }> = [];
      const createdIds: number[] = [];

      for (const item of missionItems) {
        try {
          const { request_id } = await createFlightRequest({
            owner_id:            session!.owner_id,
            api_key_id:          session!.api_key_id,
            external_mission_id: item.missionId,
            mission_type:        type,
            target,
            localization:        localization as Record<string, unknown> | undefined,
            waypoint:            item.waypoint as Record<string, unknown> | undefined,
            start_datetime:      item.startDateTime,
            priority,
            notes,
            operator,
          });
          createdIds.push(request_id);
          created.push({ missionId: item.missionId, dcc_status: 'NEW' });
        } catch (err: any) {
          // Rollback all previously created missions in this batch
          await Promise.allSettled(createdIds.map(id => deleteFlightRequest(id, session!.owner_id)));
          return NextResponse.json(
            {
              code: 0,
              status: 'ERROR',
              message: `Failed to create mission '${item.missionId}': ${err.message}. ${createdIds.length} previously created mission(s) in this batch have been rolled back.`,
            },
            { status: 500 },
          );
        }
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

const DeleteSchema = z.object({
  missionIds: z.array(z.string().min(1)).min(1, 'missionIds must have at least 1 entry').max(10, 'Maximum 10 missions can be deleted at once'),
});

export async function DELETE(req: NextRequest) {
  try {
    const { session, error } = await requireApiKey(req);
    if (error) return error;

    const body = await req.json().catch(() => null);
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const { missionIds } = parsed.data;

    // Pre-fetch all records to validate before making any changes
    const records = await getFlightRequestsByExternalIds(missionIds, session!.owner_id);

    // Check for missions that don't exist
    const foundIds = new Set(records.map(r => r.external_mission_id));
    const notFound = missionIds.filter(id => !foundIds.has(id));
    if (notFound.length > 0) {
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: `Mission ID(s) not found: ${notFound.join(', ')}. No changes made.`,
        },
        { status: 404 },
      );
    }

    // Check for already-cancelled missions
    const alreadyCancelled = records
      .filter(r => r.dcc_status === 'CANCELLED')
      .map(r => r.external_mission_id);
    if (alreadyCancelled.length > 0) {
      return NextResponse.json(
        {
          code: 0,
          status: 'ERROR',
          message: `Mission ID(s) already cancelled: ${alreadyCancelled.join(', ')}. No changes made.`,
        },
        { status: 409 },
      );
    }

    // Cancel sequentially — rollback (revert to previous status) on any DB error
    const cancelled: Array<{ request_id: number; previousStatus: string }> = [];

    for (const record of records) {
      try {
        await updateFlightRequestStatus(record.request_id, session!.owner_id, 'CANCELLED');
        cancelled.push({ request_id: record.request_id, previousStatus: record.dcc_status });
      } catch (err: any) {
        // Rollback: revert all previously cancelled records to their original status
        await Promise.allSettled(
          cancelled.map(c => updateFlightRequestStatus(c.request_id, session!.owner_id, c.previousStatus)),
        );
        return NextResponse.json(
          {
            code: 0,
            status: 'ERROR',
            message: `Failed to cancel mission '${record.external_mission_id}': ${err.message}. ${cancelled.length} previously cancelled mission(s) in this batch have been reverted.`,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      code:    1,
      status:  'SUCCESS',
      results: records.map(r => ({
        missionId: r.external_mission_id,
        status:    'cancelled',
        message:   `Mission '${r.external_mission_id}' cancelled`,
      })),
    });
  } catch (err) {
    console.error('[DELETE /api/missions]', err);
    return internalError(E.SV001, err);
  }
}
