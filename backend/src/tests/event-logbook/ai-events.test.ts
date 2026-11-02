/**
 * AI events: payload validation, IST timestamp handling, idempotent platform-level ingest,
 * claim-based visibility (company vs super admin), alert email rules and stream-id CRUD.
 * Prisma, S3 and the mail provider are mocked.
 *
 * Run:  npm test -- ai-events
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findFirst: jest.fn(), findMany: jest.fn() },
    owner: { findMany: jest.fn() },
    event_contact: { findMany: jest.fn(), count: jest.fn() },
    ai_event: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    ai_stream_mapping: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    ai_stream_mapping_contact: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/s3Client', () => ({
  getPresignedDownloadUrl: jest.fn(async (key: string) => `https://signed.example/${key}`),
  putBufferToS3: jest.fn(),
  deleteFileFromS3: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
}));
jest.mock('@/lib/auth/feature-permissions', () => ({ getSessionEffectivePermissions: jest.fn() }));
jest.mock('../../../../lib/resend/mail', () => ({ sendEventReportedEmail: jest.fn(), sendNotificationEmail: jest.fn() }));
jest.mock('@/backend/services/email/email-limit-service', () => ({
  isDailyEmailLimitReached: jest.fn().mockResolvedValue(false),
  incrementDailyEmailCount: jest.fn().mockResolvedValue(undefined),
}));

import {
  aiEventFiltersSchema,
  aiEventPayloadSchema,
  createStreamMapping,
  deleteStreamMapping,
  ingestAiEvent,
  listAiEvents,
  listStreamMappings,
  parseAiTimestamp,
  processAiEvent,
  streamMappingUpdateSchema,
  updateStreamMapping,
} from '@/backend/services/logbook/ai-event-service';
import { sendEventReportedEmail } from '../../../../lib/resend/mail';
import { incrementDailyEmailCount, isDailyEmailLimitReached } from '@/backend/services/email/email-limit-service';
import { prisma } from '@/lib/prisma';

const p = prisma as any;

const IMG = (name: string) => ({
  local_path: `intrusions/test_video_1/${name}.jpg`,
  s3_key: `ai_alerts/test_video_1/50134c7a/${name}.jpg`,
  upload_status: 'uploaded',
  resolution: { width: 1280, height: 720 },
  error: null,
});

const PAYLOAD = {
  event_type: 'INTRUSION_DETECTED',
  stream_id: 'test_video_1',
  session_id: '50134c7a-a99b-45b2-91ec-7fd1ba173d98',
  track_id: 1,
  class_name: 'person',
  confidence: 0.9247,
  timestamp: '2026-11-02 14:38:59',
  frame_number: 20,
  bounding_box: [78.97, 245.36, 385.15, 604.1],
  frames_detected: 1,
  processing_time_ms: 0.0,
  model_mode: 'REGULAR',
  s3_upload_status: 'uploaded',
  snapshot: {
    local_path: 'intrusions/test_video_1/processed.jpg',
    s3_key: 'ai_alerts/test_video_1/50134c7a/ai_processed.jpg',
    s3_upload_status: 'uploaded',
  },
  org_img: IMG('org'),
  ai_processed_img: { ...IMG('ai_processed') },
  ai_processed_img_res: { width: 640, height: 384 },
  detections: [
    { track_id: 1, class_name: 'person', confidence: 0.9247, bounding_box: [78.97, 245.36, 385.15, 604.1] },
    { track_id: 4, class_name: 'bus', confidence: 0.8394, bounding_box: [18.19, 151.57, 1274.53, 493.24] },
  ],
};

const parse = (o: object) => aiEventPayloadSchema.safeParse({ ...PAYLOAD, ...o });
const withNested = (key: 'snapshot' | 'org_img' | 'ai_processed_img' | 'ai_processed_img_res', patch: object) => parse({ [key]: { ...(PAYLOAD as any)[key], ...patch } });

beforeEach(() => {
  jest.clearAllMocks();
  (isDailyEmailLimitReached as jest.Mock).mockResolvedValue(false);
});

describe('parseAiTimestamp', () => {
  it('reads a naive timestamp as IST (UTC+5:30)', () => {
    expect(parseAiTimestamp('2026-11-02 12:27:18')?.toISOString()).toBe('2026-11-02T06:57:18.000Z');
  });
  it('honours an explicit zone', () => {
    expect(parseAiTimestamp('2026-11-02T12:27:18Z')?.toISOString()).toBe('2026-11-02T12:27:18.000Z');
    expect(parseAiTimestamp('2026-11-02T12:27:18+05:30')?.toISOString()).toBe('2026-11-02T06:57:18.000Z');
  });
  it('rolls over midnight correctly', () => {
    expect(parseAiTimestamp('2026-11-02 02:00:00')?.toISOString()).toBe('2026-11-01T20:30:00.000Z');
  });
  it.each(['', 'garbage', '2026-13-02 12:00:00', '2026-02-30 12:00:00', '2026-11-02 25:00:00', '02/11/2026 12:00'])('rejects %p', (v) => {
    expect(parseAiTimestamp(v)).toBeNull();
  });
});

describe('payload schema', () => {
  it('accepts the documented payload', () => expect(aiEventPayloadSchema.safeParse(PAYLOAD).success).toBe(true));
  it('ignores unknown fields and accepts zero processing time and an empty detections list', () => {
    expect(parse({ future_field: 1, processing_time_ms: 0, detections: [] }).success).toBe(true);
  });

  const TOP = Object.keys(PAYLOAD) as (keyof typeof PAYLOAD)[];
  it.each(TOP)('rejects a payload without %s', (field) => {
    const { [field]: _omit, ...rest } = PAYLOAD;
    expect(aiEventPayloadSchema.safeParse(rest).success).toBe(false);
  });
  it.each(TOP)('rejects a null %s', (field) => expect(parse({ [field]: null }).success).toBe(false));

  it.each(['local_path', 's3_key', 's3_upload_status'])('rejects a snapshot without %s', (f) => {
    const { [f]: _o, ...snapshot } = PAYLOAD.snapshot as Record<string, string>;
    expect(parse({ snapshot }).success).toBe(false);
  });
  it.each(['org_img', 'ai_processed_img'] as const)('requires every field of %s, but lets error be null', (key) => {
    expect(withNested(key, { error: null }).success).toBe(true);
    expect(withNested(key, { error: 'upload timed out' }).success).toBe(true);
    for (const f of ['local_path', 's3_key', 'upload_status', 'resolution', 'error']) {
      const { [f]: _o, ...img } = (PAYLOAD as any)[key];
      expect(parse({ [key]: img }).success).toBe(false);
    }
    expect(withNested(key, { resolution: { width: 0, height: 720 } }).success).toBe(false);
    expect(withNested(key, { resolution: { width: 1280 } }).success).toBe(false);
  });
  it('requires ai_processed_img_res width and height', () => {
    expect(withNested('ai_processed_img_res', { width: undefined }).success).toBe(false);
    expect(withNested('ai_processed_img_res', { height: 1.5 }).success).toBe(false);
  });
  it.each([
    ['without track_id', { track_id: undefined }],
    ['with 3 box numbers', { bounding_box: [1, 2, 3] }],
    ['with confidence > 1', { confidence: 1.5 }],
    ['without class_name', { class_name: undefined }],
  ])('rejects a detection %s', (_n, patch) => {
    expect(parse({ detections: [{ ...PAYLOAD.detections[0], ...patch }] }).success).toBe(false);
  });
  it('rejects more than 200 detections', () => {
    expect(parse({ detections: Array.from({ length: 201 }, () => PAYLOAD.detections[0]) }).success).toBe(false);
  });

  it.each([
    ['empty stream_id', { stream_id: '  ' }],
    ['confidence > 1', { confidence: 1.2 }],
    ['negative confidence', { confidence: -0.1 }],
    ['3-number bounding box', { bounding_box: [1, 2, 3] }],
    ['non-numeric bounding box', { bounding_box: [1, 2, 3, 'x'] }],
    ['fractional track', { track_id: 1.5 }],
    ['oversized stream_id', { stream_id: 'x'.repeat(201) }],
    ['negative processing time', { processing_time_ms: -1 }],
  ])('rejects %s', (_n, o) => expect(parse(o).success).toBe(false));

  it.each([
    'other_prefix/x.jpg',
    '/ai_alerts/x.jpg',
    'ai_alerts/../secrets/x.jpg',
    'ai_alerts//x.jpg',
    'ai_alerts/',
    'ai_alerts/x y.jpg',
    'https://bucket.s3.amazonaws.com/ai_alerts/x.jpg',
  ])('rejects the S3 key %p (it would let a caller presign any object in the bucket)', (key) => {
    expect(withNested('ai_processed_img', { s3_key: key }).success).toBe(false);
    expect(withNested('org_img', { s3_key: key }).success).toBe(false);
    expect(withNested('snapshot', { s3_key: key }).success).toBe(false);
  });
});

describe('ingestAiEvent', () => {
  beforeEach(() => {
    p.ai_stream_mapping.findUnique.mockResolvedValue(null);
    p.ai_event.create.mockResolvedValue({ ai_event_id: 7 });
  });
  const run = (o: object = {}) => ingestAiEvent(aiEventPayloadSchema.parse({ ...PAYLOAD, ...o }));
  const created = () => p.ai_event.create.mock.calls[0][0].data;

  it('stores the event without any owner, in UTC, with the image keys, sizes and detections', async () => {
    const r = await run();
    expect(r).toEqual({ aiEventId: 7, duplicate: false, claimed: false });
    expect(created()).not.toHaveProperty('fk_owner_id');
    expect(created()).toMatchObject({
      event_type: 'INTRUSION_DETECTED',
      track_id: 1,
      snapshot_key: PAYLOAD.snapshot.s3_key,
      ai_img_key: PAYLOAD.ai_processed_img.s3_key,
      org_img_key: PAYLOAD.org_img.s3_key,
      org_img_width: 1280,
      org_img_height: 720,
      ai_res_width: 640,
      ai_res_height: 384,
      snapshot_status: 'stored',
    });
    expect(created().event_time.toISOString()).toBe('2026-11-02T09:08:59.000Z');
    expect(created().detections).toHaveLength(2);
  });

  const CLAIM = { fk_owner_id: 5, fk_client_id: 19, ai_stream_mapping_contact: [] as { fk_contact_id: number }[] };

  it('reports whether a company has already added the stream id', async () => {
    p.ai_stream_mapping.findUnique.mockResolvedValue(CLAIM);
    expect((await run()).claimed).toBe(true);
    expect(p.ai_stream_mapping.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { stream_id: 'test_video_1' } }));
  });

  describe('snapshot of the stream settings (history must not change when the stream does)', () => {
    it('records the client name and Linked when the stream had a client', async () => {
      p.ai_stream_mapping.findUnique.mockResolvedValue(CLAIM);
      p.client.findFirst.mockResolvedValue({ client_name: 'Acme' });
      await run();
      expect(created()).toMatchObject({ client_id: 19, client_name: 'Acme', alerts_linked: true });
      expect(p.client.findFirst.mock.calls[0][0].where).toEqual({ client_id: 19, fk_owner_id: 5 });
    });

    it('is Linked with contacts only, and records no client', async () => {
      p.ai_stream_mapping.findUnique.mockResolvedValue({ ...CLAIM, fk_client_id: null, ai_stream_mapping_contact: [{ fk_contact_id: 9 }] });
      await run();
      expect(created()).toMatchObject({ client_id: null, client_name: null, alerts_linked: true });
      expect(p.client.findFirst).not.toHaveBeenCalled();
    });

    it('is Not linked when the stream was added with no client and no contact', async () => {
      p.ai_stream_mapping.findUnique.mockResolvedValue({ ...CLAIM, fk_client_id: null });
      await run();
      expect(created()).toMatchObject({ client_id: null, client_name: null, alerts_linked: false });
    });

    it('is Not linked when nobody has added the stream id', async () => {
      await run();
      expect(created()).toMatchObject({ client_id: null, client_name: null, alerts_linked: false });
    });
  });

  it('keeps no key for an image the model did not finish uploading', async () => {
    await run({ org_img: { ...IMG('org'), upload_status: 'failed', error: 'timeout' } });
    expect(created()).toMatchObject({ org_img_key: null, ai_img_key: PAYLOAD.ai_processed_img.s3_key, snapshot_status: 'stored' });
  });

  it('marks the snapshot failed when no image was uploaded', async () => {
    await run({
      s3_upload_status: 'failed',
      org_img: { ...IMG('org'), upload_status: 'failed' },
      ai_processed_img: { ...IMG('ai'), upload_status: 'failed' },
    });
    expect(created()).toMatchObject({ snapshot_key: null, ai_img_key: null, org_img_key: null, snapshot_status: 'failed' });
  });

  it('treats a retry (unique violation) as a duplicate and returns the existing id', async () => {
    p.ai_event.create.mockRejectedValue({ code: 'P2002' });
    p.ai_event.findFirst.mockResolvedValue({ ai_event_id: 5 });
    expect(await run()).toMatchObject({ aiEventId: 5, duplicate: true });
  });

  it('looks a retry up by the same five values the unique index uses, stream id included', async () => {
    p.ai_event.create.mockRejectedValue({ code: 'P2002' });
    p.ai_event.findFirst.mockResolvedValue({ ai_event_id: 5 });
    await run({ stream_id: 'test_video_11' });
    expect(Object.keys(p.ai_event.findFirst.mock.calls[0][0].where).sort()).toEqual(['event_time', 'event_type', 'session_id', 'stream_id', 'track_id']);
    expect(p.ai_event.findFirst.mock.calls[0][0].where.stream_id).toBe('test_video_11');
  });

  it('stores the same detection reported for another stream as a new event', async () => {
    await run({ stream_id: 'test_video_11' });
    expect(created()).toMatchObject({ stream_id: 'test_video_11', session_id: PAYLOAD.session_id, track_id: 1 });
  });

  it('rethrows other database errors', async () => {
    p.ai_event.create.mockRejectedValue(new Error('db down'));
    await expect(run()).rejects.toThrow('db down');
  });

  it('rejects an unparseable timestamp with a 400-style error', async () => {
    await expect(run({ timestamp: 'nope' })).rejects.toMatchObject({ status: 400 });
    expect(p.ai_event.create).not.toHaveBeenCalled();
  });
});

describe('processAiEvent', () => {
  const EVENT = {
    ai_event_id: 7,
    stream_id: 'test_video_1',
    notify_status: 'pending',
    event_type: 'INTRUSION_DETECTED',
    class_name: 'person',
    confidence: 0.75,
    event_time: new Date('2026-11-02T06:57:18Z'),
    ai_img_key: 'ai_alerts/s/ai.jpg',
    snapshot_key: 'ai_alerts/s/ai.jpg',
    org_img_key: 'ai_alerts/s/org.jpg',
  };
  const MAPPING = { mapping_id: 1, fk_owner_id: 5, is_active: true, notify_client: true, fk_client_id: 19, ai_stream_mapping_contact: [{ fk_contact_id: 9 }] };
  const notifyStatus = () => p.ai_event.update.mock.calls.map((c: any) => c[0].data).find((d: any) => d.notify_status)?.notify_status;

  beforeEach(() => {
    p.ai_event.findUnique.mockResolvedValue(EVENT);
    p.ai_event.update.mockResolvedValue({});
    p.ai_event.count.mockResolvedValue(0);
    p.ai_stream_mapping.findUnique.mockResolvedValue(MAPPING);
    p.client.findFirst.mockResolvedValue({ client_name: 'Acme', client_email: 'Client@Acme.com' });
    p.event_contact.findMany.mockResolvedValue([{ email: 'ops@acme.com' }, { email: 'client@acme.com' }]);
    (sendEventReportedEmail as jest.Mock).mockResolvedValue(true);
  });

  it('emails the de-duplicated client + contacts, attaches both images and records it', async () => {
    await processAiEvent(7);
    const [to, , props] = (sendEventReportedEmail as jest.Mock).mock.calls[0];
    expect(to).toEqual(['client@acme.com', 'ops@acme.com']);
    expect(props.attachments.map((a: any) => a.previewUrl)).toEqual(['https://signed.example/ai_alerts/s/ai.jpg', 'https://signed.example/ai_alerts/s/org.jpg']);
    expect(notifyStatus()).toBe('sent');
  });

  it('uses the company that added the stream for the contacts and the daily limit', async () => {
    await processAiEvent(7);
    expect(p.event_contact.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 5 });
    expect(isDailyEmailLimitReached).toHaveBeenCalledWith(5);
    expect(incrementDailyEmailCount).toHaveBeenCalledWith(5);
  });

  it('only stores an event whose stream id nobody added', async () => {
    p.ai_stream_mapping.findUnique.mockResolvedValue(null);
    await processAiEvent(7);
    expect(sendEventReportedEmail).not.toHaveBeenCalled();
    expect(notifyStatus()).toBe('not_linked');
  });

  it('sends nothing while alerts are paused', async () => {
    p.ai_stream_mapping.findUnique.mockResolvedValue({ ...MAPPING, is_active: false });
    await processAiEvent(7);
    expect(sendEventReportedEmail).not.toHaveBeenCalled();
    expect(notifyStatus()).toBe('inactive');
  });

  it('emails only the selected contacts when the client address is switched off', async () => {
    p.ai_stream_mapping.findUnique.mockResolvedValue({ ...MAPPING, notify_client: false });
    p.event_contact.findMany.mockResolvedValue([{ email: 'ops@acme.com' }]);
    await processAiEvent(7);
    expect((sendEventReportedEmail as jest.Mock).mock.calls[0][0]).toEqual(['ops@acme.com']);
  });

  it('works for a stream added without a client (contacts only)', async () => {
    p.ai_stream_mapping.findUnique.mockResolvedValue({ ...MAPPING, fk_client_id: null });
    p.event_contact.findMany.mockResolvedValue([{ email: 'ops@acme.com' }]);
    await processAiEvent(7);
    expect(p.client.findFirst).not.toHaveBeenCalled();
    expect((sendEventReportedEmail as jest.Mock).mock.calls[0][0]).toEqual(['ops@acme.com']);
  });

  it('records no_recipients for a stream with no notification settings', async () => {
    p.ai_stream_mapping.findUnique.mockResolvedValue({ ...MAPPING, fk_client_id: null, ai_stream_mapping_contact: [] });
    p.event_contact.findMany.mockResolvedValue([]);
    await processAiEvent(7);
    expect(sendEventReportedEmail).not.toHaveBeenCalled();
    expect(notifyStatus()).toBe('no_recipients');
  });

  it('skips an invalid client address', async () => {
    p.client.findFirst.mockResolvedValue({ client_name: 'Acme', client_email: 'not-an-email' });
    p.event_contact.findMany.mockResolvedValue([]);
    await processAiEvent(7);
    expect(notifyStatus()).toBe('no_recipients');
  });

  it('emails every new event, even right after another one for the same stream (nothing is throttled)', async () => {
    await processAiEvent(7);
    p.ai_event.findUnique.mockResolvedValue({ ...EVENT, ai_event_id: 8 });
    await processAiEvent(8);
    p.ai_event.findUnique.mockResolvedValue({ ...EVENT, ai_event_id: 9, event_type: 'LOITERING', ai_img_key: null });
    await processAiEvent(9);
    expect(sendEventReportedEmail).toHaveBeenCalledTimes(3);
    expect(p.ai_event.count).not.toHaveBeenCalled();
  });

  it.each(['sent', 'failed', 'no_recipients', 'not_linked', 'limit_reached'])('never handles an event twice: one already marked %s sends nothing more', async (status) => {
    p.ai_event.findUnique.mockResolvedValue({ ...EVENT, notify_status: status });
    await processAiEvent(7);
    expect(sendEventReportedEmail).not.toHaveBeenCalled();
    expect(p.ai_event.update).not.toHaveBeenCalled();
    expect(p.ai_stream_mapping.findUnique).not.toHaveBeenCalled();
  });

  it('respects the daily email limit', async () => {
    (isDailyEmailLimitReached as jest.Mock).mockResolvedValue(true);
    await processAiEvent(7);
    expect(sendEventReportedEmail).not.toHaveBeenCalled();
    expect(notifyStatus()).toBe('limit_reached');
  });

  it('records a mail failure instead of throwing', async () => {
    (sendEventReportedEmail as jest.Mock).mockResolvedValue(false);
    await expect(processAiEvent(7)).resolves.toBeUndefined();
    expect(notifyStatus()).toBe('failed');
  });

  it('never throws, even when the database is down', async () => {
    p.ai_event.findUnique.mockRejectedValue(new Error('db down'));
    await expect(processAiEvent(7)).resolves.toBeUndefined();
  });
});

describe('listAiEvents', () => {
  const ROW = {
    ai_event_id: 1, event_type: 'INTRUSION_DETECTED', session_id: 's', track_id: 1, class_name: 'person', confidence: 0.9, event_time: new Date('2026-11-02T09:00:00Z'),
    frame_number: 1, bounding_box: [1, 2, 3, 4], frames_detected: 1, processing_time_ms: 0, model_mode: 'REGULAR', snapshot_key: 'ai_alerts/a.jpg', snapshot_status: 'stored',
    notify_status: 'sent', notified_emails: [], ai_img_key: 'ai_alerts/ai.jpg', org_img_key: 'ai_alerts/org.jpg', org_img_width: 1280, org_img_height: 720,
    detections: [{ track_id: 1, class_name: 'person', confidence: 0.9, bounding_box: [1, 2, 3, 4] }, { bad: true }],
    client_name: 'Jhon Doe', alerts_linked: true,
  };
  const MAPS = [
    { stream_id: 'cam_a', fk_owner_id: 5, fk_client_id: 19 },
    { stream_id: 'cam_b', fk_owner_id: 6, fk_client_id: null },
  ];
  const whereOf = () => p.ai_event.findMany.mock.calls[0][0].where.AND;

  beforeEach(() => {
    p.ai_stream_mapping.findMany.mockResolvedValue(MAPS);
    p.owner.findMany.mockResolvedValue([{ owner_id: 5, owner_name: 'Acme Ltd' }, { owner_id: 6, owner_name: 'Beta Corp' }]);
    p.client.findMany.mockResolvedValue([{ client_id: 19, client_name: 'Jhon Doe' }]);
    p.ai_event.count.mockResolvedValue(0);
    p.ai_event.findMany.mockResolvedValue([]);
  });

  it('a company only sees the stream ids it added, and never learns other companies', async () => {
    p.ai_stream_mapping.findMany.mockResolvedValue([MAPS[0]]);
    p.ai_event.findMany.mockResolvedValue([{ ...ROW, stream_id: 'cam_a' }]);
    p.ai_event.count.mockResolvedValue(1);
    const r = await listAiEvents({ ownerId: 5, isSuperAdmin: false }, { company: 'unclaimed' });
    expect(p.ai_stream_mapping.findMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 5 });
    expect(whereOf()).toEqual([{ stream_id: { in: ['cam_a'] } }]); // the company filter is ignored
    expect(r.scope).toBe('company');
    expect(r.companies).toEqual([]);
    expect(r.data[0]).toMatchObject({ company_name: null, client_name: 'Jhon Doe', claimed: true });
    expect(p.owner.findMany).not.toHaveBeenCalled();
  });

  it('shows the client the event was received with, not the stream\'s current client', async () => {
    // the stream now points at client 19 ("Jhon Doe"), but these events arrived earlier
    p.ai_event.findMany.mockResolvedValue([
      { ...ROW, ai_event_id: 1, stream_id: 'cam_a', client_name: null, alerts_linked: false },
      { ...ROW, ai_event_id: 2, stream_id: 'cam_a', client_name: 'Old Client', alerts_linked: true },
      { ...ROW, ai_event_id: 3, stream_id: 'cam_a', client_name: 'Jhon Doe', alerts_linked: true },
    ]);
    const r = await listAiEvents({ ownerId: 5, isSuperAdmin: false }, {});
    expect(r.data.map((e) => [e.client_name, e.linked])).toEqual([[null, false], ['Old Client', true], ['Jhon Doe', true]]);
    expect(p.client.findMany).not.toHaveBeenCalled();
  });

  it('a company with no stream ids sees nothing', async () => {
    p.ai_stream_mapping.findMany.mockResolvedValue([]);
    await listAiEvents({ ownerId: 5, isSuperAdmin: false }, {});
    expect(whereOf()).toEqual([{ stream_id: { in: [] } }]);
  });

  it('a super admin sees every event with the claiming company, and gets the company list', async () => {
    p.ai_event.findMany.mockResolvedValue([{ ...ROW, stream_id: 'cam_a' }, { ...ROW, ai_event_id: 2, stream_id: 'cam_b' }, { ...ROW, ai_event_id: 3, stream_id: 'nobody' }]);
    const r = await listAiEvents({ ownerId: 1, isSuperAdmin: true }, {});
    expect(p.ai_stream_mapping.findMany.mock.calls[0][0].where).toEqual({});
    expect(whereOf()).toEqual([]);
    expect(r.scope).toBe('all');
    expect(r.companies).toEqual([{ owner_id: 5, name: 'Acme Ltd' }, { owner_id: 6, name: 'Beta Corp' }]);
    expect(r.data.map((e) => [e.company_name, e.claimed])).toEqual([['Acme Ltd', true], ['Beta Corp', true], [null, false]]);
  });

  it('a super admin can filter to unclaimed events or to one company', async () => {
    await listAiEvents({ ownerId: 1, isSuperAdmin: true }, { company: 'unclaimed' });
    expect(whereOf()).toEqual([{ stream_id: { notIn: ['cam_a', 'cam_b'] } }]);
    p.ai_event.findMany.mockClear();
    await listAiEvents({ ownerId: 1, isSuperAdmin: true }, { company: 6 });
    expect(whereOf()).toEqual([{ stream_id: { in: ['cam_b'] } }]);
  });

  it('pages server-side: 8 per page by default, or the page size asked for', async () => {
    await listAiEvents({ ownerId: 1, isSuperAdmin: true }, {});
    expect(p.ai_event.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 8 });
    await listAiEvents({ ownerId: 1, isSuperAdmin: true }, { page: 3, page_size: 16 });
    expect(p.ai_event.findMany.mock.calls[1][0]).toMatchObject({ skip: 32, take: 16 });
    p.ai_event.count.mockResolvedValue(21);
    expect(await listAiEvents({ ownerId: 1, isSuperAdmin: true }, { page: 2, page_size: 8 })).toMatchObject({ total: 21, page: 2, page_size: 8 });
  });

  it('rejects an unreasonable page size', () => {
    expect(aiEventFiltersSchema.safeParse({ page_size: 0 }).success).toBe(false);
    expect(aiEventFiltersSchema.safeParse({ page_size: 101 }).success).toBe(false);
    expect(aiEventFiltersSchema.safeParse({ page_size: 56, page: 2 }).success).toBe(true);
  });

  it('combines the stream search, type and dates', async () => {
    await listAiEvents({ ownerId: 1, isSuperAdmin: true }, { stream_id: 'cam', event_type: 'intrusion_detected', date_start: '2026-11-01T00:00:00.000Z' });
    expect(whereOf()).toEqual([
      { stream_id: { contains: 'cam', mode: 'insensitive' } },
      { event_type: { contains: 'intrusion_detected', mode: 'insensitive' } },
      { event_time: { gte: new Date('2026-11-01T00:00:00.000Z') } },
    ]);
  });

  it('lists the latest added event first, whatever time the model put on it', async () => {
    await listAiEvents({ ownerId: 1, isSuperAdmin: true }, {});
    expect(p.ai_event.findMany.mock.calls[0][0].orderBy).toEqual({ ai_event_id: 'desc' });
  });

  it.each([
    ['intrusion', 'intrusion'],
    ['INTRUSION_REMAIN', 'INTRUSION_REMAIN'],
    ['intrusion remain', 'intrusion_remain'],
    ['  Intrusion   Detected ', 'Intrusion_Detected'],
  ])('searches the event type like the stream id: part of the name, any case, spaces for underscores (%p)', async (typed, searched) => {
    await listAiEvents({ ownerId: 1, isSuperAdmin: true }, { event_type: typed });
    expect(whereOf()).toEqual([{ event_type: { contains: searched, mode: 'insensitive' } }]);
  });

  it('applies the event type search to a company view as well, next to its own stream ids', async () => {
    p.ai_stream_mapping.findMany.mockResolvedValue([MAPS[0]]);
    await listAiEvents({ ownerId: 5, isSuperAdmin: false }, { event_type: 'intrusion' });
    expect(whereOf()).toEqual([{ stream_id: { in: ['cam_a'] } }, { event_type: { contains: 'intrusion', mode: 'insensitive' } }]);
  });

  it('returns both image URLs, the frame size and only well-formed detections', async () => {
    p.ai_event.findMany.mockResolvedValue([{ ...ROW, stream_id: 'cam_a' }]);
    const e = (await listAiEvents({ ownerId: 1, isSuperAdmin: true }, {})).data[0];
    expect(e.snapshot_url).toBe('https://signed.example/ai_alerts/ai.jpg');
    expect(e.original_url).toBe('https://signed.example/ai_alerts/org.jpg');
    expect(e.original_size).toEqual({ width: 1280, height: 720 });
    expect(e.detections).toHaveLength(1);
  });

  it('shows rows stored before the new payload: -1 track, copy kept in snapshot_key, no original', async () => {
    p.ai_event.findMany.mockResolvedValue([{ ...ROW, stream_id: 'cam_a', track_id: -1, ai_img_key: null, org_img_key: null, org_img_width: null, org_img_height: null, detections: [] }]);
    const e = (await listAiEvents({ ownerId: 1, isSuperAdmin: true }, {})).data[0];
    expect(e).toMatchObject({ track_id: null, snapshot_url: 'https://signed.example/ai_alerts/a.jpg', original_url: null, original_size: null, detections: [] });
  });
});

describe('stream ids (claims)', () => {
  it('lists the latest added stream id first', async () => {
    p.ai_stream_mapping.findMany.mockResolvedValue([]);
    await listStreamMappings(5);
    expect(p.ai_stream_mapping.findMany.mock.calls[0][0]).toMatchObject({ where: { fk_owner_id: 5 }, orderBy: { mapping_id: 'desc' } });
  });
  it('create: a stream id alone is enough', async () => {
    p.ai_stream_mapping.findFirst.mockResolvedValue(null);
    p.ai_stream_mapping.create.mockResolvedValue({ mapping_id: 4 });
    await createStreamMapping(1, 2, { stream_id: 'cam_a', contact_ids: [] });
    expect(p.client.findFirst).not.toHaveBeenCalled();
    expect(p.ai_stream_mapping.create.mock.calls[0][0].data).toMatchObject({ fk_owner_id: 1, stream_id: 'cam_a', fk_client_id: null, notify_client: true });
  });
  it('create: rejects a stream id that any company already added (409), checked across all companies', async () => {
    p.ai_stream_mapping.findFirst.mockResolvedValue({ mapping_id: 1 });
    await expect(createStreamMapping(1, 2, { stream_id: 'cam_a', contact_ids: [] })).rejects.toMatchObject({ status: 409, message: 'This stream id is already in use' });
    expect(p.ai_stream_mapping.findFirst.mock.calls[0][0].where).toEqual({ stream_id: 'cam_a' });
    expect(p.ai_stream_mapping.create).not.toHaveBeenCalled();
  });
  it('create: two companies adding the same id at once -> the loser gets 409', async () => {
    p.ai_stream_mapping.findFirst.mockResolvedValue(null);
    p.ai_stream_mapping.create.mockRejectedValue({ code: 'P2002' });
    await expect(createStreamMapping(1, 2, { stream_id: 'cam_a', contact_ids: [] })).rejects.toMatchObject({ status: 409 });
  });
  it('create: rejects a client from another owner', async () => {
    p.client.findFirst.mockResolvedValue(null);
    await expect(createStreamMapping(1, 2, { stream_id: 's', client_id: 99, contact_ids: [] })).rejects.toMatchObject({ status: 404 });
    expect(p.ai_stream_mapping.create).not.toHaveBeenCalled();
  });
  it('create: rejects contacts that are not all in the owner contact book', async () => {
    p.event_contact.count.mockResolvedValue(1);
    await expect(createStreamMapping(1, 2, { stream_id: 's', contact_ids: [1, 2] })).rejects.toMatchObject({ status: 404 });
  });
  it('create: de-duplicates contact ids', async () => {
    p.event_contact.count.mockResolvedValue(1);
    p.ai_stream_mapping.findFirst.mockResolvedValue(null);
    p.ai_stream_mapping.create.mockResolvedValue({ mapping_id: 4 });
    await createStreamMapping(1, 2, { stream_id: 's', contact_ids: [7, 7] });
    expect(p.ai_stream_mapping.create.mock.calls[0][0].data.ai_stream_mapping_contact.create).toEqual([{ fk_contact_id: 7 }]);
  });
  it('update: a toggle-only patch leaves the contacts and client alone', async () => {
    p.ai_stream_mapping.findFirst.mockResolvedValue({ mapping_id: 4, fk_client_id: 5, stream_id: 's' });
    p.ai_stream_mapping.update.mockReturnValue('update');
    p.$transaction.mockResolvedValue([]);
    const parsed = streamMappingUpdateSchema.parse({ is_active: false });
    expect(parsed.contact_ids).toBeUndefined();
    await updateStreamMapping(1, 4, parsed);
    expect(p.ai_stream_mapping_contact.deleteMany).not.toHaveBeenCalled();
    const data = p.ai_stream_mapping.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('ai_stream_mapping_contact');
    expect(data).not.toHaveProperty('fk_client_id');
  });
  it('update: the client can be cleared with null', async () => {
    p.ai_stream_mapping.findFirst.mockResolvedValue({ mapping_id: 4, fk_client_id: 5, stream_id: 's' });
    p.ai_stream_mapping.update.mockReturnValue('update');
    p.$transaction.mockResolvedValue([]);
    await updateStreamMapping(1, 4, streamMappingUpdateSchema.parse({ client_id: null }));
    expect(p.ai_stream_mapping.update.mock.calls[0][0].data).toMatchObject({ fk_client_id: null });
  });
  it('update: renaming to a stream id someone else holds is a 409', async () => {
    p.ai_stream_mapping.findFirst.mockResolvedValueOnce({ mapping_id: 4, fk_client_id: null, stream_id: 'old' }).mockResolvedValueOnce({ mapping_id: 8 });
    await expect(updateStreamMapping(1, 4, { stream_id: 'taken' })).rejects.toMatchObject({ status: 409 });
  });
  it('update/delete: 404 for another owner mapping', async () => {
    p.ai_stream_mapping.findFirst.mockResolvedValue(null);
    await expect(updateStreamMapping(1, 4, { is_active: false })).rejects.toMatchObject({ status: 404 });
    await expect(deleteStreamMapping(1, 4)).rejects.toMatchObject({ status: 404 });
    expect(p.ai_stream_mapping.delete).not.toHaveBeenCalled();
  });
});
