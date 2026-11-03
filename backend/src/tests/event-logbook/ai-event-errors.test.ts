/**
 * AI events ingest: what the sender is told when storing an event fails.
 *
 * Run:  npm test -- ai-event-errors
 */

jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/auth/feature-permissions', () => ({ getSessionEffectivePermissions: jest.fn() }));

import { EventLogbookError } from '@/backend/services/logbook/event-logbook-service';
import { describeIngestFailure } from '@/lib/ai-event-errors';

const REF = 'ab12cd34';
const run = (err: unknown) => describeIngestFailure(err, REF);

describe('describeIngestFailure', () => {
  it('passes a domain error through with its own status and message (e.g. an unreadable timestamp)', () => {
    expect(run(new EventLogbookError('Invalid timestamp. Expected "YYYY-MM-DD HH:mm:ss"'))).toEqual({
      status: 400,
      error: 'Invalid timestamp. Expected "YYYY-MM-DD HH:mm:ss"',
      errorCode: 'EVENT_REJECTED',
      retryable: false,
    });
  });

  it('explains a duplicate that could not be matched, as a 409 that is not worth retrying', () => {
    const f = run({ code: 'P2002' });
    expect(f).toMatchObject({ status: 409, errorCode: 'EVENT_CONFLICT', retryable: false });
    expect(f.error).toContain('stream_id, session_id, track_id, event_type and timestamp');
    expect(f.reference).toBeUndefined();
  });

  it.each([
    ['Prisma P2021 (table missing)', { code: 'P2021' }],
    ['Prisma P2022 (column missing)', { code: 'P2022' }],
    ['Postgres 42P01', { code: '42P01' }],
    ['Postgres 42703', { code: '42703' }],
    ['a driver message', new Error('column "org_img_key" of relation "ai_event" does not exist')],
    ['a relation message', new Error('relation "public.ai_event" does not exist')],
  ])('tells the sender the database migrations are missing for %s', (_n, err) => {
    const f = run(err);
    expect(f).toMatchObject({ status: 500, errorCode: 'DB_SCHEMA_OUTDATED', retryable: false, reference: REF });
    expect(f.error).toContain('migrations');
    expect(f.error).toContain(REF);
  });

  it.each([
    ['Prisma P1001', { code: 'P1001' }],
    ['Prisma P2024 (pool timeout)', { code: 'P2024' }],
    ['ECONNREFUSED', { code: 'ECONNREFUSED' }],
    ['a driver message', new Error("Can't reach database server at db.example.com:5432")],
  ])('reports a temporary database outage as a retryable 503 for %s', (_n, err) => {
    expect(run(err)).toMatchObject({ status: 503, errorCode: 'DB_UNAVAILABLE', retryable: true, reference: REF });
  });

  it('gives any other failure a reference and a retry hint, without leaking the raw error', () => {
    const f = run(new Error('insert into "ai_event" (secret_column) values ($1) failed'));
    expect(f).toMatchObject({ status: 500, errorCode: 'STORE_FAILED', retryable: true, reference: REF });
    expect(f.error).toContain(REF);
    expect(f.error).not.toMatch(/ai_event|secret_column|insert/i);
  });

  it('copes with non-Error values', () => {
    expect(run(undefined)).toMatchObject({ status: 500, errorCode: 'STORE_FAILED' });
    expect(run('boom')).toMatchObject({ status: 500, errorCode: 'STORE_FAILED' });
  });

  it('never exposes the raw message of a schema or outage error either', () => {
    expect(run(new Error('column "org_img_key" of relation "ai_event" does not exist')).error).not.toContain('org_img_key');
    expect(run(new Error("Can't reach database server at db.example.com:5432")).error).not.toContain('db.example.com');
  });
});
