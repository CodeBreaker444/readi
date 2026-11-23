/**
 * Per-client DCC integrations: mission scope (external / internal / all), API key
 * issuing + signing, endpoint resolution, scoped callbacks, status updates and the
 * retry outbox. Prisma, fetch, SSRF check and token encryption are mocked.
 *
 * Run:  npm test -- dcc-integrations
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findFirst: jest.fn(), findMany: jest.fn() },
    dcc_client_endpoints: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    dcc_callback_outbox: { create: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
    pilot_mission: { findUnique: jest.fn() },
    flight_requests: { findFirst: jest.fn() },
  },
}));
jest.mock('@/backend/utils/token-encryption', () => ({
  encryptToken: jest.fn((v: string) => `enc(${v})`),
  decryptToken: jest.fn((v: string) => {
    if (v === 'corrupt') throw new Error('bad ciphertext');
    return v.replace(/^enc\(|\)$/g, '');
  }),
}));
jest.mock('@/lib/safe-url', () => ({ assertSafeCallbackUrl: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));

import { createHmac } from 'crypto';
import { decryptToken, encryptToken } from '@/backend/utils/token-encryption';
import { assertSafeCallbackUrl } from '@/lib/safe-url';
import { prisma } from '@/lib/prisma';
import { buildDccAuthHeaders, isRetryableResult } from '@/backend/services/mission/dcc-http';
import { resolveDccEndpoint, scopeAllows } from '@/backend/services/mission/dcc-settings-service';
import {
  listClientEndpoints,
  notifyClientMissionStatus,
  rotateClientEndpointKey,
  upsertClientEndpoint,
} from '@/backend/services/mission/dcc-client-status-service';
import {
  notifyDccBulkCancellation,
  notifyDccExecutionForRequest,
  notifyDccMissionCreation,
} from '@/backend/services/mission/dcc-callback-service';
import { processDccOutbox, resendDccOutboxItem } from '@/backend/services/mission/dcc-outbox-service';

const db = prisma as any;
const fetchMock = jest.fn();
(global as any).fetch = fetchMock;

const endpoint = (over: Record<string, unknown> = {}) => ({
  callback_url: 'https://dcc.client-a.test/api',
  status_url: 'https://dcc.client-a.test/status',
  active: true,
  mission_scope: 'ALL',
  api_key_encrypted: 'enc(dcckey_secret1)',
  ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  (encryptToken as jest.Mock).mockImplementation((v: string) => `enc(${v})`);
  (decryptToken as jest.Mock).mockImplementation((v: string) => {
    if (v === 'corrupt') throw new Error('bad ciphertext');
    return v.replace(/^enc\(|\)$/g, '');
  });
  (assertSafeCallbackUrl as jest.Mock).mockResolvedValue(undefined);
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
  db.dcc_callback_outbox.create.mockResolvedValue({});
});

describe('scopeAllows', () => {
  it.each([
    ['ALL', 'EXTERNAL', true],
    ['ALL', 'INTERNAL', true],
    ['EXTERNAL', 'EXTERNAL', true],
    ['EXTERNAL', 'INTERNAL', false],
    ['INTERNAL', 'INTERNAL', true],
    ['INTERNAL', 'EXTERNAL', false],
    ['garbage', 'EXTERNAL', false],
    ['', 'INTERNAL', false],
  ])('scope %s + origin %s → %s', (scope, origin, expected) => {
    expect(scopeAllows(scope, origin as any)).toBe(expected);
  });
});

describe('buildDccAuthHeaders', () => {
  it('sends the key and a verifiable HMAC signature when a key exists', () => {
    const h = buildDccAuthHeaders('dcckey_secret1', '{"a":1}');
    expect(h['X-API-Key']).toBe('dcckey_secret1');
    const expected = createHmac('sha256', 'dcckey_secret1').update(`${h['X-Readi-Timestamp']}.{"a":1}`).digest('hex');
    expect(h['X-Readi-Signature']).toBe(`sha256=${expected}`);
    expect(h.Authorization).toBeUndefined();
  });

  it('signs an empty body (calls without a body)', () => {
    const h = buildDccAuthHeaders('k', '');
    const expected = createHmac('sha256', 'k').update(`${h['X-Readi-Timestamp']}.`).digest('hex');
    expect(h['X-Readi-Signature']).toBe(`sha256=${expected}`);
  });

  it('falls back to Basic auth for integrations without a key', () => {
    const h = buildDccAuthHeaders(null, 'x');
    expect(h.Authorization).toMatch(/^Basic /);
    expect(h['X-API-Key']).toBeUndefined();
  });
});

describe('resolveDccEndpoint', () => {
  it('refuses a mission with no client (no org-wide fallback)', async () => {
    const r = await resolveDccEndpoint(1, null, 'INTERNAL');
    expect(r.ok).toBe(false);
    expect(db.dcc_client_endpoints.findUnique).not.toHaveBeenCalled();
  });

  it('refuses when the client has no integration', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(null);
    expect((await resolveDccEndpoint(1, 5, 'EXTERNAL')).ok).toBe(false);
  });

  it('refuses an inactive integration or one without a callback URL', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValueOnce(endpoint({ active: false }));
    expect((await resolveDccEndpoint(1, 5, 'EXTERNAL')).ok).toBe(false);
    db.dcc_client_endpoints.findUnique.mockResolvedValueOnce(endpoint({ callback_url: null }));
    expect((await resolveDccEndpoint(1, 5, 'EXTERNAL')).ok).toBe(false);
  });

  it('refuses a mission outside the integration scope', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ mission_scope: 'INTERNAL' }));
    const r = await resolveDccEndpoint(1, 5, 'EXTERNAL');
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(/internal/);
  });

  it('returns the URL and the decrypted key', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint());
    const r = await resolveDccEndpoint(1, 5, 'EXTERNAL');
    expect(r).toEqual({ ok: true, endpoint: { url: 'https://dcc.client-a.test/api', apiKey: 'dcckey_secret1' } });
  });

  it('works for a legacy integration with no key', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ api_key_encrypted: null }));
    const r = await resolveDccEndpoint(1, 5, 'INTERNAL');
    expect(r).toMatchObject({ ok: true, endpoint: { apiKey: null } });
  });

  it('looks the integration up by owner AND client (no cross-owner leakage)', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(null);
    await resolveDccEndpoint(7, 5, 'INTERNAL');
    expect(db.dcc_client_endpoints.findUnique.mock.calls[0][0].where).toEqual({
      fk_owner_id_fk_client_id: { fk_owner_id: 7, fk_client_id: 5 },
    });
  });
});

describe('upsertClientEndpoint / rotate', () => {
  it('returns null for a client outside the owner', async () => {
    db.client.findFirst.mockResolvedValue(null);
    expect(await upsertClientEndpoint(1, 99, { callbackUrl: 'https://x.test' }, true)).toBeNull();
    expect(db.dcc_client_endpoints.upsert).not.toHaveBeenCalled();
  });

  it('issues a key on creation: encrypted in the DB, last 6 stored, plaintext returned once; scope defaults to ALL', async () => {
    db.client.findFirst.mockResolvedValue({ client_id: 5 });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(null);
    const r = await upsertClientEndpoint(1, 5, { callbackUrl: 'https://x.test' }, true);
    expect(r?.created).toBe(true);
    expect(r?.apiKey).toMatch(/^dcckey_[0-9a-f]{48}$/);
    const call = db.dcc_client_endpoints.upsert.mock.calls[0][0];
    expect(call.create.api_key_encrypted).toBe(`enc(${r!.apiKey})`);
    expect(call.create.api_key_last6).toBe(r!.apiKey!.slice(-6));
    expect(call.create.mission_scope).toBe('ALL');
    expect(JSON.stringify(call)).not.toContain(`"${r!.apiKey}"`); // plaintext never persisted
  });

  it('does NOT regenerate the key when editing an integration that already has one', async () => {
    db.client.findFirst.mockResolvedValue({ client_id: 5 });
    db.dcc_client_endpoints.findUnique.mockResolvedValue({ id: 1, api_key_encrypted: 'enc(old)' });
    const r = await upsertClientEndpoint(1, 5, { missionScope: 'EXTERNAL' }, true);
    expect(r).toEqual({ created: false, apiKey: null });
    const call = db.dcc_client_endpoints.upsert.mock.calls[0][0];
    expect(call.update.api_key_encrypted).toBeUndefined();
    expect(call.update.mission_scope).toBe('EXTERNAL');
  });

  it('issues a key to a legacy integration that has none', async () => {
    db.client.findFirst.mockResolvedValue({ client_id: 5 });
    db.dcc_client_endpoints.findUnique.mockResolvedValue({ id: 1, api_key_encrypted: null });
    const r = await upsertClientEndpoint(1, 5, { callbackUrl: 'https://x.test' }, true);
    expect(r?.created).toBe(false);
    expect(r?.apiKey).toBeTruthy();
  });

  it('leaves untouched fields alone on update (undefined) and clears with null', async () => {
    db.client.findFirst.mockResolvedValue({ client_id: 5 });
    db.dcc_client_endpoints.findUnique.mockResolvedValue({ id: 1, api_key_encrypted: 'enc(k)' });
    await upsertClientEndpoint(1, 5, { statusUrl: null }, true);
    const u = db.dcc_client_endpoints.upsert.mock.calls[0][0].update;
    expect(u.status_url).toBeNull();
    expect('callback_url' in u).toBe(false);
  });

  it('rotate returns a new key whose last 6 are stored, and null when there is no integration', async () => {
    db.dcc_client_endpoints.updateMany.mockResolvedValueOnce({ count: 1 });
    const r = await rotateClientEndpointKey(1, 5);
    expect(r!.last6).toBe(r!.apiKey.slice(-6));
    expect(db.dcc_client_endpoints.updateMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 1, fk_client_id: 5 });
    db.dcc_client_endpoints.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await rotateClientEndpointKey(1, 99)).toBeNull();
  });

  it('list never exposes the encrypted key and tolerates a missing scope', async () => {
    db.dcc_client_endpoints.findMany.mockResolvedValue([
      { id: 1, fk_client_id: 5, status_url: null, callback_url: 'https://x.test', mission_scope: undefined, api_key_encrypted: 'enc(k)', api_key_last6: 'abc123', active: true },
    ]);
    db.client.findMany.mockResolvedValue([{ client_id: 5, client_name: 'Acme' }]);
    const [row] = await listClientEndpoints(1);
    expect(row.mission_scope).toBe('ALL');
    expect(row.api_key_last6).toBe('abc123');
    expect(JSON.stringify(row)).not.toContain('enc(');
  });
});

describe('scoped DCC callbacks', () => {
  it('external request (client key) is skipped when the integration is INTERNAL only', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ mission_scope: 'INTERNAL' }));
    const r = await notifyDccExecutionForRequest(1, 'M-1', 5);
    expect(r.outcome).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.dcc_callback_outbox.create).not.toHaveBeenCalled(); // skipped is never queued for retry
  });

  it('external request is sent with the key + signature when scope allows', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ mission_scope: 'EXTERNAL' }));
    const r = await notifyDccExecutionForRequest(1, 'M-1', 5);
    expect(r.outcome).toBe('success');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://dcc.client-a.test/api/dcc/missions/M-1/execution');
    expect(init.headers['X-API-Key']).toBe('dcckey_secret1');
    expect(init.headers['X-Readi-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('trailing slash on the callback URL does not double the slash', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ callback_url: 'https://dcc.client-a.test/api/' }));
    await notifyDccExecutionForRequest(1, 'M-1', 5);
    expect(fetchMock.mock.calls[0][0]).toBe('https://dcc.client-a.test/api/dcc/missions/M-1/execution');
  });

  it('internal mission creation is skipped for an EXTERNAL-only integration, sent for INTERNAL and ALL', async () => {
    const payload = { type: 'ON-DEMAND', missions: [{ missionId: 'A', startDateTime: 'x' }] };
    db.dcc_client_endpoints.findUnique.mockResolvedValueOnce(endpoint({ mission_scope: 'EXTERNAL' }));
    expect((await notifyDccMissionCreation(1, payload, 5)).outcome).toBe('skipped');
    db.dcc_client_endpoints.findUnique.mockResolvedValueOnce(endpoint({ mission_scope: 'INTERNAL' }));
    expect((await notifyDccMissionCreation(1, payload, 5)).outcome).toBe('success');
    db.dcc_client_endpoints.findUnique.mockResolvedValueOnce(endpoint({ mission_scope: 'ALL' }));
    expect((await notifyDccMissionCreation(1, payload, 5)).outcome).toBe('success');
  });

  it('a mission with no client sends nothing and does not throw (cancel + create)', async () => {
    expect((await notifyDccMissionCreation(1, { type: 'ON-DEMAND', missions: [] }, null)).outcome).toBe('skipped');
    expect((await notifyDccBulkCancellation(1, ['A'], undefined)).outcome).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a failing client is queued for retry and its key is not leaked into the queue', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint());
    fetchMock.mockResolvedValue({ ok: false, status: 503, text: async () => 'down' });
    const r = await notifyDccExecutionForRequest(1, 'M-1', 5);
    expect(r.outcome).toBe('http_error');
    const row = db.dcc_callback_outbox.create.mock.calls[0][0].data;
    expect(row.status).toBe('PENDING');
    expect(row.strict).toBe(true);
    expect(JSON.stringify(row)).not.toContain('dcckey_');
  });

  it('a corrupt stored key does not throw out of the notifier', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ api_key_encrypted: 'corrupt' }));
    const r = await notifyDccExecutionForRequest(1, 'M-1', 5);
    expect(r.outcome).toBe('network_error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('notifyClientMissionStatus scope', () => {
  const mission = { fk_owner_id: 1, fk_client_id: 5, fk_planning_id: 10, mission_code: 'OP-1', mission_name: 'N', scheduled_start: null, actual_start: null, actual_end: null, abort_reason: 'wind' };

  it('external mission (flight request linked) is skipped for INTERNAL-only', async () => {
    db.pilot_mission.findUnique.mockResolvedValue(mission);
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ mission_scope: 'INTERNAL' }));
    db.flight_requests.findFirst.mockResolvedValue({ external_mission_id: 'EXT-1' });
    await notifyClientMissionStatus(1, 'IN_PROGRESS');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('internal mission is skipped for EXTERNAL-only (both URLs)', async () => {
    db.pilot_mission.findUnique.mockResolvedValue({ ...mission, fk_planning_id: null });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ mission_scope: 'EXTERNAL' }));
    await notifyClientMissionStatus(1, 'COMPLETED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('internal mission: status URL gets the simple payload AND the callback URL gets the DCC call, both with the key', async () => {
    db.pilot_mission.findUnique.mockResolvedValue({ ...mission, fk_planning_id: null });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ mission_scope: 'INTERNAL' }));
    await notifyClientMissionStatus(1, 'ABORTED');
    const calls = fetchMock.mock.calls;
    const cb = calls.find((c: any[]) => c[0] === 'https://dcc.client-a.test/api/dcc/missions/OP-1/termination');
    const st = calls.find((c: any[]) => c[0] === 'https://dcc.client-a.test/status');
    expect(cb).toBeTruthy();
    expect(JSON.parse(cb![1].body)).toEqual({ result: 0, note: 'wind' });
    expect(cb![1].headers['X-API-Key']).toBe('dcckey_secret1');
    expect(st![1].headers['X-API-Key']).toBe('dcckey_secret1');
    expect(JSON.parse(st![1].body)).toMatchObject({ missionId: 'OP-1', status: 'ABORTED', note: 'wind' });
  });

  it.each([
    ['IN_PROGRESS', '/dcc/missions/OP-1/execution', undefined],
    ['COMPLETED', '/dcc/missions/OP-1/termination', { result: 1, note: '' }],
  ])('internal %s with ONLY a callback URL reaches the client in DCC format', async (status, path, body) => {
    db.pilot_mission.findUnique.mockResolvedValue({ ...mission, fk_planning_id: null, abort_reason: null });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ status_url: null, mission_scope: 'INTERNAL' }));
    await notifyClientMissionStatus(1, status as any);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://dcc.client-a.test/api' + path);
    expect(init.body === undefined ? undefined : JSON.parse(init.body)).toEqual(body);
  });

  it('PLANNED / CANCELLED have no DCC-format equivalent and send nothing to the callback URL', async () => {
    db.pilot_mission.findUnique.mockResolvedValue({ ...mission, fk_planning_id: null });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ status_url: null }));
    await notifyClientMissionStatus(1, 'PLANNED');
    await notifyClientMissionStatus(1, 'CANCELLED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('external missions are NOT repeated on the callback URL from the board (flight-request flow owns them)', async () => {
    db.pilot_mission.findUnique.mockResolvedValue(mission);
    db.flight_requests.findFirst.mockResolvedValue({ external_mission_id: 'EXT-1' });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ mission_scope: 'ALL' }));
    await notifyClientMissionStatus(1, 'COMPLETED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://dcc.client-a.test/status');
  });

  it('a failing status URL does not stop the callback call, and a failing callback is queued for retry', async () => {
    db.pilot_mission.findUnique.mockResolvedValue({ ...mission, fk_planning_id: null });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint());
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/execution') ? { ok: false, status: 503, text: async () => '' } : { ok: true, status: 200, text: async () => '' });
    await notifyClientMissionStatus(1, 'IN_PROGRESS');
    expect(db.dcc_callback_outbox.create).toHaveBeenCalledTimes(1);
    expect(db.dcc_callback_outbox.create.mock.calls[0][0].data.path).toBe('/dcc/missions/OP-1/execution');
    expect(fetchMock.mock.calls.some((c: any[]) => c[0].endsWith('/status'))).toBe(true);
  });

  it('does nothing for an inactive integration, one with no URLs, or a mission without a client — and never throws', async () => {
    db.pilot_mission.findUnique.mockResolvedValue({ ...mission, fk_planning_id: null });
    db.dcc_client_endpoints.findUnique.mockResolvedValueOnce(endpoint({ status_url: null, callback_url: null }));
    await notifyClientMissionStatus(1, 'COMPLETED');
    db.dcc_client_endpoints.findUnique.mockResolvedValueOnce(endpoint({ active: false }));
    await notifyClientMissionStatus(1, 'COMPLETED');
    db.pilot_mission.findUnique.mockResolvedValueOnce({ ...mission, fk_client_id: null });
    await notifyClientMissionStatus(1, 'COMPLETED');
    db.pilot_mission.findUnique.mockRejectedValueOnce(new Error('db down'));
    await expect(notifyClientMissionStatus(1, 'COMPLETED')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('retryable statuses', () => {
  it.each([
    [401, true], [403, true], [408, true], [429, true], [500, true], [503, true],
    [400, false], [404, false], [422, false],
  ])('HTTP %i retryable=%s', (httpStatus, expected) => {
    expect(isRetryableResult({ path: '/x', outcome: 'http_error', message: '', httpStatus })).toBe(expected);
  });

  it('a 403 from a rotated-away key is queued as PENDING (retry), not FAILED', async () => {
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint());
    fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'bad key' });
    await notifyDccExecutionForRequest(1, 'M-1', 5);
    expect(db.dcc_callback_outbox.create.mock.calls[0][0].data.status).toBe('PENDING');
  });
});

describe('outbox', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: 1, fk_owner_id: 1, fk_client_id: 5, strict: true, path: '/dcc/missions/M-1/execution', body: null,
    status: 'PENDING', attempts: 1, next_attempt_at: new Date(Date.now() - 1000), ...over,
  });

  it('retries use the integration current URL and key', async () => {
    db.dcc_callback_outbox.findMany.mockResolvedValue([row()]);
    db.dcc_callback_outbox.updateMany.mockResolvedValue({ count: 1 });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ callback_url: 'https://new.client-a.test', api_key_encrypted: 'enc(rotated)' }));
    const r = await processDccOutbox();
    expect(r).toEqual({ processed: 1, succeeded: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://new.client-a.test/dcc/missions/M-1/execution');
    expect(init.headers['X-API-Key']).toBe('rotated');
  });

  it('a row whose integration was removed or re-scoped is marked FAILED, not retried forever', async () => {
    db.dcc_callback_outbox.findMany.mockResolvedValue([row()]);
    db.dcc_callback_outbox.updateMany.mockResolvedValue({ count: 1 });
    db.dcc_client_endpoints.findUnique.mockResolvedValue(null);
    await processDccOutbox();
    expect(db.dcc_callback_outbox.update.mock.calls[0][0].data).toMatchObject({ status: 'FAILED', next_attempt_at: null });
  });

  it('one row with a corrupt key does not abort the rest of the batch', async () => {
    db.dcc_callback_outbox.findMany.mockResolvedValue([row({ id: 1 }), row({ id: 2, fk_client_id: 6 })]);
    db.dcc_callback_outbox.updateMany.mockResolvedValue({ count: 1 });
    db.dcc_client_endpoints.findUnique
      .mockResolvedValueOnce(endpoint({ api_key_encrypted: 'corrupt' }))
      .mockResolvedValueOnce(endpoint());
    const r = await processDccOutbox();
    expect(r).toEqual({ processed: 2, succeeded: 1 });
  });

  it('manual resend of a corrupt-key row reports a result instead of throwing', async () => {
    db.dcc_callback_outbox.findFirst.mockResolvedValue(row());
    db.dcc_client_endpoints.findUnique.mockResolvedValue(endpoint({ api_key_encrypted: 'corrupt' }));
    const r = await resendDccOutboxItem(1, 1);
    expect(r?.outcome).toBe('skipped');
  });
});
