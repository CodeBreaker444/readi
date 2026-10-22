/**
 * Event webhooks: input validation, SSRF protection, config CRUD, signed delivery
 * with retries, and the dispatch rules for event.created / event.updated.
 * Prisma, DNS, fetch, S3 and token encryption are mocked.
 *
 * Run:  npm test -- event-webhooks
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    public_users: { findUnique: jest.fn() },
    tool: { findUnique: jest.fn() },
    pilot_mission: { findUnique: jest.fn() },
    pilot_event: { findUnique: jest.fn(), findMany: jest.fn() },
    pilot_event_type: { findMany: jest.fn() },
    event_webhook_config: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    event_webhook_delivery: { findMany: jest.fn(), create: jest.fn() },
  },
}));
jest.mock('@/lib/s3Client', () => ({
  deleteFileFromS3: jest.fn(),
  getPresignedDownloadUrl: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
}));
jest.mock('@/lib/auth/feature-permissions', () => ({ getSessionEffectivePermissions: jest.fn() }));
jest.mock('@/backend/utils/token-encryption', () => ({
  encryptToken: jest.fn((v: string) => `enc(${v})`),
  decryptToken: jest.fn((v: string) => v.replace(/^enc\(|\)$/g, '')),
}));
jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

import { createHmac } from 'crypto';
import { lookup } from 'dns/promises';
import {
  createWebhook,
  deleteWebhook,
  dispatchEventCreated,
  dispatchEventSupportMedia,
  listDeliveries,
  listWebhooks,
  rotateWebhookSecret,
  sendTestWebhook,
  updateWebhook,
  webhookInputSchema,
} from '@/backend/services/logbook/event-webhook-service';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { decryptToken, encryptToken } from '@/backend/utils/token-encryption';

const db = prisma as any;
const mockLookup = lookup as unknown as jest.Mock;
const mockFetch = jest.fn();

const PUBLIC_IP = '93.184.216.34';
const URL_OK = 'https://hooks.example.com/readi';

const response = (status: number) => ({ status, ok: status >= 200 && status < 300 });

beforeEach(() => {
  jest.resetAllMocks();
  // resetAllMocks removes the factory implementations, so restore the fake encryption.
  (encryptToken as jest.Mock).mockImplementation((v: string) => `enc(${v})`);
  (decryptToken as jest.Mock).mockImplementation((v: string) => v.replace(/^enc\(|\)$/g, ''));
  mockLookup.mockResolvedValue([{ address: PUBLIC_IP, family: 4 }]);
  (global as any).fetch = mockFetch;
  mockFetch.mockResolvedValue(response(200));
  (getPresignedDownloadUrl as jest.Mock).mockImplementation(async (key: string) => `https://s3/${key}`);
  db.event_webhook_delivery.create.mockResolvedValue({});
  db.pilot_event_type.findMany.mockResolvedValue([{ type_code: 'bird_strike' }]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── schema ───────────────────────────────────────────────────────────────────

describe('webhookInputSchema', () => {
  it('trims and defaults event_types', () => {
    const r = webhookInputSchema.parse({ name: '  Hook  ', url: ` ${URL_OK} ` });
    expect(r).toEqual({ name: 'Hook', url: URL_OK, event_types: [] });
  });
  it.each([
    ['empty name', { name: ' ', url: URL_OK }],
    ['invalid URL', { name: 'x', url: 'not a url' }],
    ['URL over 2000 chars', { name: 'x', url: `https://a.com/${'x'.repeat(2000)}` }],
    ['non-positive client', { name: 'x', url: URL_OK, client_id: 0 }],
    ['empty event type code', { name: 'x', url: URL_OK, event_types: [''] }],
  ])('rejects %s', (_n, input) => {
    expect(webhookInputSchema.safeParse(input).success).toBe(false);
  });
});

// ─── SSRF protection (exercised through createWebhook) ───────────────────────

describe('webhook URL validation', () => {
  const create = (url: string) => createWebhook(1, 2, webhookInputSchema.parse({ name: 'h', url }));
  beforeEach(() => db.event_webhook_config.create.mockResolvedValue({ webhook_id: 9 }));

  it('rejects plain http', async () => {
    await expect(create('http://hooks.example.com/x')).rejects.toThrow('must use HTTPS');
  });
  it('rejects embedded credentials', async () => {
    await expect(create('https://user:pw@hooks.example.com/x')).rejects.toThrow('must not contain credentials');
  });
  it('rejects hosts that cannot be resolved', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(create(URL_OK)).rejects.toThrow('could not be resolved');
  });
  it.each([
    ['10.0.0.1'], ['127.0.0.1'], ['0.0.0.0'], ['169.254.169.254'], ['172.16.0.5'], ['172.31.255.1'],
    ['192.168.1.1'], ['100.64.0.1'], ['100.127.255.255'],
  ])('rejects the private IPv4 literal %s without a DNS lookup', async (ip) => {
    await expect(create(`https://${ip}/x`)).rejects.toThrow('public host');
    expect(mockLookup).not.toHaveBeenCalled();
  });
  it.each([['[::1]'], ['[fd00::1]'], ['[fe80::1]']])('rejects the private IPv6 literal %s', async (host) => {
    await expect(create(`https://${host}/x`)).rejects.toThrow();
  });
  // KNOWN BUG (event-webhook-service.ts isPrivateAddress): the URL parser rewrites
  // [::ffff:10.0.0.1] to [::ffff:a00:1] (hex form), which the IPv4-mapped check does not
  // understand, so private addresses pass as public. Remove `.failing` once it is fixed.
  it.failing.each([['[::ffff:10.0.0.1]'], ['[::ffff:127.0.0.1]']])('rejects the IPv4-mapped private IPv6 literal %s', async (host) => {
    await expect(create(`https://${host}/x`)).rejects.toThrow('public host');
  });
  it('accepts public addresses just outside the private ranges', async () => {
    await expect(create('https://172.32.0.1/x')).resolves.toBeDefined();
    await expect(create('https://100.128.0.1/x')).resolves.toBeDefined();
  });
  it('rejects a hostname when any resolved address is private', async () => {
    mockLookup.mockResolvedValue([{ address: PUBLIC_IP }, { address: '10.1.2.3' }]);
    await expect(create(URL_OK)).rejects.toThrow('public host');
  });
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

describe('createWebhook', () => {
  const input = webhookInputSchema.parse({ name: 'h', url: URL_OK, event_types: ['bird_strike'] });

  it('stores the secret encrypted and returns it once', async () => {
    db.event_webhook_config.create.mockResolvedValue({ webhook_id: 9 });
    const r = await createWebhook(1, 2, input);
    expect(r.webhook_id).toBe(9);
    expect(r.secret).toMatch(/^whsec_[0-9a-f]{48}$/);
    const data = db.event_webhook_config.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ fk_owner_id: 1, fk_client_id: null, is_active: true, created_by: 2, event_types: ['bird_strike'] });
    expect(data.secret_encrypted).toBe(`enc(${r.secret})`);
  });
  it('generates a different secret each time', async () => {
    db.event_webhook_config.create.mockResolvedValue({ webhook_id: 9 });
    const a = await createWebhook(1, 2, input);
    const b = await createWebhook(1, 2, input);
    expect(a.secret).not.toBe(b.secret);
  });
  it('rejects a client of another company before saving', async () => {
    db.client.findFirst.mockResolvedValue(null);
    await expect(createWebhook(1, 2, { ...input, client_id: 9 })).rejects.toMatchObject({ status: 404 });
    expect(db.event_webhook_config.create).not.toHaveBeenCalled();
  });
  it('rejects unknown event type codes', async () => {
    db.pilot_event_type.findMany.mockResolvedValue([]);
    db.pilot_event.findMany.mockResolvedValue([]);
    await expect(createWebhook(1, 2, input)).rejects.toThrow('Unknown event type');
  });
  it('accepts a historical code carried by reported events', async () => {
    db.pilot_event_type.findMany.mockResolvedValue([]);
    db.pilot_event.findMany.mockResolvedValue([{ event_type: 'bird_strike' }]);
    db.event_webhook_config.create.mockResolvedValue({ webhook_id: 9 });
    await expect(createWebhook(1, 2, input)).resolves.toBeDefined();
  });
});

describe('listWebhooks', () => {
  it('maps configs with client name and last delivery', async () => {
    db.event_webhook_config.findMany.mockResolvedValue([
      {
        webhook_id: 1, name: 'A', url: URL_OK, fk_client_id: 5, event_types: [], is_active: true,
        created_at: new Date('2026-10-01T00:00:00Z'),
        event_webhook_delivery: [{ success: false, response_status: 500, created_at: new Date('2026-10-02T00:00:00Z') }],
      },
      {
        webhook_id: 2, name: 'B', url: URL_OK, fk_client_id: null, event_types: ['x'], is_active: false,
        created_at: new Date('2026-10-01T00:00:00Z'), event_webhook_delivery: [],
      },
    ]);
    db.client.findMany.mockResolvedValue([{ client_id: 5, client_name: 'Acme' }]);
    const r = await listWebhooks(1);
    expect(r[0]).toMatchObject({ client_name: 'Acme', last_delivery: { success: false, response_status: 500, created_at: '2026-10-02T00:00:00.000Z' } });
    expect(r[1]).toMatchObject({ client_name: null, last_delivery: null });
    expect(JSON.stringify(r)).not.toContain('secret');
  });
  it('skips the client query when no webhook has a client', async () => {
    db.event_webhook_config.findMany.mockResolvedValue([]);
    await listWebhooks(1);
    expect(db.client.findMany).not.toHaveBeenCalled();
  });
});

describe('ownership checks', () => {
  beforeEach(() => db.event_webhook_config.findFirst.mockResolvedValue(null));

  it('update, rotate, delete, deliveries and test all 404 for another company\'s webhook', async () => {
    await expect(updateWebhook(1, 5, { name: 'x' })).rejects.toMatchObject({ status: 404 });
    await expect(rotateWebhookSecret(1, 5)).rejects.toMatchObject({ status: 404 });
    await expect(deleteWebhook(1, 5)).rejects.toMatchObject({ status: 404 });
    await expect(listDeliveries(1, 5)).rejects.toMatchObject({ status: 404 });
    await expect(sendTestWebhook(1, 5)).rejects.toMatchObject({ status: 404 });
    expect(db.event_webhook_config.findFirst.mock.calls.every((c: any) => c[0].where.fk_owner_id === 1)).toBe(true);
    expect(db.event_webhook_config.update).not.toHaveBeenCalled();
    expect(db.event_webhook_config.delete).not.toHaveBeenCalled();
  });
});

describe('updateWebhook', () => {
  const existing = { webhook_id: 5, fk_owner_id: 1, url: URL_OK, event_types: ['old_type'], secret_encrypted: 'enc(s)' };
  beforeEach(() => db.event_webhook_config.findFirst.mockResolvedValue(existing));

  it('only writes the provided fields', async () => {
    await updateWebhook(1, 5, { is_active: false });
    const data = db.event_webhook_config.update.mock.calls[0][0].data;
    expect(Object.keys(data).sort()).toEqual(['is_active', 'updated_at']);
  });
  it('re-validates a changed URL', async () => {
    await expect(updateWebhook(1, 5, { url: 'http://x.example.com' })).rejects.toThrow('must use HTTPS');
    expect(db.event_webhook_config.update).not.toHaveBeenCalled();
  });
  it('allows null client_id to clear the filter without a client lookup', async () => {
    await updateWebhook(1, 5, { client_id: null });
    expect(db.client.findFirst).not.toHaveBeenCalled();
    expect(db.event_webhook_config.update.mock.calls[0][0].data.fk_client_id).toBeNull();
  });
  it('keeps codes the webhook already holds even if their type was deleted', async () => {
    db.pilot_event_type.findMany.mockResolvedValue([]);
    db.pilot_event.findMany.mockResolvedValue([]);
    await expect(updateWebhook(1, 5, { event_types: ['old_type'] })).resolves.toBeUndefined();
    await expect(updateWebhook(1, 5, { event_types: ['old_type', 'ghost'] })).rejects.toThrow('Unknown event type');
  });
});

describe('rotateWebhookSecret / deleteWebhook / listDeliveries', () => {
  beforeEach(() => db.event_webhook_config.findFirst.mockResolvedValue({ webhook_id: 5, fk_owner_id: 1 }));

  it('rotates to a new encrypted secret and returns it', async () => {
    const { secret } = await rotateWebhookSecret(1, 5);
    expect(secret).toMatch(/^whsec_/);
    expect(db.event_webhook_config.update.mock.calls[0][0].data.secret_encrypted).toBe(`enc(${secret})`);
  });
  it('deletes the config', async () => {
    await deleteWebhook(1, 5);
    expect(db.event_webhook_config.delete).toHaveBeenCalledWith({ where: { webhook_id: 5 } });
  });
  it('lists the last 50 deliveries, newest first', async () => {
    db.event_webhook_delivery.findMany.mockResolvedValue([
      { delivery_id: 2, fk_event_id: 20, is_test: false, success: true, response_status: 200, error_message: null, duration_ms: 12, created_at: new Date('2026-10-02T00:00:00Z') },
    ]);
    const r = await listDeliveries(1, 5);
    expect(r[0]).toMatchObject({ delivery_id: 2, created_at: '2026-10-02T00:00:00.000Z' });
    expect(db.event_webhook_delivery.findMany.mock.calls[0][0]).toMatchObject({ where: { fk_webhook_id: 5 }, take: 50, orderBy: { delivery_id: 'desc' } });
  });
});

// ─── delivery ─────────────────────────────────────────────────────────────────

const config = { webhook_id: 5, fk_owner_id: 1, name: 'Hook', url: URL_OK, secret_encrypted: 'enc(whsec_test)' };

describe('sendTestWebhook (delivery mechanics)', () => {
  beforeEach(() => db.event_webhook_config.findFirst.mockResolvedValue(config));

  it('POSTs a signed JSON body and records a successful test delivery', async () => {
    const r = await sendTestWebhook(1, 5);
    expect(r).toEqual({ success: true, status: 200, error: null });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(URL_OK);
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    expect(init.headers['X-Readi-Event']).toBe('event.test');

    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ type: 'event.test', data: { webhook_id: 5, webhook_name: 'Hook' } });
    expect(body.id).toBe(init.headers['X-Readi-Delivery']);

    const expected = createHmac('sha256', 'whsec_test').update(`${init.headers['X-Readi-Timestamp']}.${init.body}`).digest('hex');
    expect(init.headers['X-Readi-Signature']).toBe(`sha256=${expected}`);

    expect(db.event_webhook_delivery.create.mock.calls[0][0].data).toMatchObject({
      fk_webhook_id: 5, fk_event_id: null, is_test: true, success: true, response_status: 200, error_message: null,
    });
  });

  it('does not retry a client error (4xx)', async () => {
    mockFetch.mockResolvedValue(response(404));
    const r = await sendTestWebhook(1, 5);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ success: false, status: 404, error: 'HTTP 404' });
  });

  it('retries once on a server error and succeeds', async () => {
    mockFetch.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200));
    const r = await sendTestWebhook(1, 5);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(r.success).toBe(true);
  });

  it('gives up after two attempts', async () => {
    mockFetch.mockResolvedValue(response(500));
    const r = await sendTestWebhook(1, 5);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ success: false, status: 500, error: 'HTTP 500' });
  });

  it('retries after a network error and records the message', async () => {
    mockFetch.mockRejectedValue(new Error('socket hang up'));
    const r = await sendTestWebhook(1, 5);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ success: false, status: null, error: 'socket hang up' });
  });

  it('re-validates the host at send time (DNS rebinding) and never calls fetch', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.8' }]);
    const r = await sendTestWebhook(1, 5);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/public host/);
  });

  it('still returns the result when recording the delivery fails', async () => {
    db.event_webhook_delivery.create.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(sendTestWebhook(1, 5)).resolves.toMatchObject({ success: true });
  });
});

// ─── dispatch ─────────────────────────────────────────────────────────────────

const eventRow = (over: Record<string, unknown> = {}) => ({
  event_id: 20, fk_owner_id: 1, fk_pilot_user_id: 7, fk_tool_id: 10, fk_mission_id: 100, fk_client_id: 5,
  fk_event_type_id: 3, event_type: 'bird_strike', event_type_label: 'Bird strike',
  takeoff_time: new Date('2026-10-20T10:00:00Z'), created_at: new Date('2026-10-20T11:00:00Z'),
  latitude: '45.1', longitude: '9.2', location_label: 'Field', notes: 'n',
  pilot_event_attachment: [
    { attachment_id: 1, is_supporting: false, file_name: 'a.png', file_type: 'image/png', file_size: BigInt(4), file_key: 'k1' },
    { attachment_id: 2, is_supporting: true, file_name: 'v.mp4', file_type: 'video/mp4', file_size: null, file_key: 'k2' },
  ],
  ...over,
});

function mockEvent(event: unknown = eventRow()) {
  db.pilot_event.findUnique.mockResolvedValue(event);
  db.public_users.findUnique.mockResolvedValue({ first_name: 'Ann', last_name: 'Lee' });
  db.tool.findUnique.mockResolvedValue({ tool_name: 'Drone', tool_code: 'D1' });
  db.pilot_mission.findUnique.mockResolvedValue({ mission_name: ' Roof ', mission_code: 'M-1' });
  db.client.findUnique.mockResolvedValue({ client_name: 'Acme' });
}

const hook = (id: number, over: Record<string, unknown> = {}) => ({
  webhook_id: id, url: `https://hooks.example.com/${id}`, secret_encrypted: 'enc(whsec_test)', event_types: [], fk_client_id: null, ...over,
});

const sentBodies = () => mockFetch.mock.calls.map((c) => JSON.parse(c[1].body));

describe('dispatchEventCreated', () => {
  it('does nothing for an unknown event', async () => {
    db.pilot_event.findUnique.mockResolvedValue(null);
    await dispatchEventCreated(20);
    expect(db.event_webhook_config.findMany).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends the full payload to every matching active webhook', async () => {
    mockEvent();
    db.event_webhook_config.findMany.mockResolvedValue([hook(1), hook(2)]);
    await dispatchEventCreated(20);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [body] = sentBodies();
    expect(body.type).toBe('event.created');
    expect(body.data).toMatchObject({
      event_id: 20, event_type_id: 3, event_type: 'bird_strike', event_type_label: 'Bird strike',
      takeoff_time: '2026-10-20T10:00:00.000Z', reported_at: '2026-10-20T11:00:00.000Z',
      location: { latitude: 45.1, longitude: 9.2, label: 'Field' }, notes: 'n',
      pilot: { id: 7, name: 'Ann Lee' }, drone: { id: 10, name: 'Drone', code: 'D1' },
      mission: { id: 100, name: 'Roof', code: 'M-1' }, client: { id: 5, name: 'Acme' },
    });
    expect(body.data.attachments).toHaveLength(2);
    expect(body.data.attachments[0]).toMatchObject({ attachment_id: 1, file_size: 4, url: 'https://s3/k1', url_expires_in_seconds: 604800 });
    expect(body.data.attachments[1]).toMatchObject({ is_supporting: true, file_size: null });
    expect(db.event_webhook_delivery.create).toHaveBeenCalledTimes(2);
  });

  it('omits mission and client when the event has none', async () => {
    mockEvent(eventRow({ fk_mission_id: null, fk_client_id: null }));
    db.event_webhook_config.findMany.mockResolvedValue([hook(1)]);
    await dispatchEventCreated(20);
    expect(sentBodies()[0].data).toMatchObject({ mission: null, client: null });
  });

  it('queries only active webhooks of the owner for the event client or no client', async () => {
    mockEvent();
    db.event_webhook_config.findMany.mockResolvedValue([]);
    await dispatchEventCreated(20);
    expect(db.event_webhook_config.findMany.mock.calls[0][0].where).toEqual({
      fk_owner_id: 1, is_active: true, OR: [{ fk_client_id: null }, { fk_client_id: 5 }],
    });
  });

  it('only filters on null client when the event has no client', async () => {
    mockEvent(eventRow({ fk_client_id: null }));
    db.event_webhook_config.findMany.mockResolvedValue([]);
    await dispatchEventCreated(20);
    expect(db.event_webhook_config.findMany.mock.calls[0][0].where.OR).toEqual([{ fk_client_id: null }]);
  });

  it('honours the event type filter (empty list = all types)', async () => {
    mockEvent();
    db.event_webhook_config.findMany.mockResolvedValue([
      hook(1, { event_types: [] }),
      hook(2, { event_types: ['bird_strike', 'rf'] }),
      hook(3, { event_types: ['rf'] }),
    ]);
    await dispatchEventCreated(20);
    expect(mockFetch.mock.calls.map((c) => c[0])).toEqual(['https://hooks.example.com/1', 'https://hooks.example.com/2']);
  });

  it('one failing endpoint does not stop the others', async () => {
    mockEvent();
    db.event_webhook_config.findMany.mockResolvedValue([hook(1), hook(2)]);
    mockFetch.mockImplementation(async (url: string) => (url.endsWith('/1') ? response(400) : response(200)));
    await dispatchEventCreated(20);
    const results = db.event_webhook_delivery.create.mock.calls.map((c: any) => [c[0].data.fk_webhook_id, c[0].data.success]);
    expect(results).toEqual(expect.arrayContaining([[1, false], [2, true]]));
  });

  it('never throws, even when a query fails', async () => {
    db.pilot_event.findUnique.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(dispatchEventCreated(20)).resolves.toBeUndefined();
  });
});

describe('dispatchEventSupportMedia', () => {
  beforeEach(() => {
    mockEvent();
    db.event_webhook_config.findMany.mockResolvedValue([hook(1)]);
  });

  it('sends event.updated with only the newly added media', async () => {
    await dispatchEventSupportMedia(20, [2]);
    const [body] = sentBodies();
    expect(body.type).toBe('event.updated');
    expect(body.data.update_type).toBe('support_media');
    expect(body.data.new_media.map((m: any) => m.attachment_id)).toEqual([2]);
    expect(body.data).not.toHaveProperty('attachments');
    expect(body.data.event_id).toBe(20);
  });

  it('sends nothing when none of the ids belong to the event', async () => {
    await dispatchEventSupportMedia(20, [999]);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(db.event_webhook_config.findMany).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    db.pilot_event.findUnique.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(dispatchEventSupportMedia(20, [2])).resolves.toBeUndefined();
  });
});
