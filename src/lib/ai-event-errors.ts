import { EventLogbookError } from '@/backend/services/logbook/event-logbook-service';

export interface IngestFailure {
  status: number;
  error: string;
  errorCode: string;
  retryable: boolean;
  reference?: string;
}

const UNREACHABLE_PRISMA = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2028']);
const UNREACHABLE_NODE = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE']);

const codeOf = (err: unknown): string | undefined => {
  const c = (err as { code?: unknown } | null)?.code;
  return typeof c === 'string' ? c : undefined;
};
const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err ?? ''));
 
export function describeIngestFailure(err: unknown, reference: string): IngestFailure {
  if (err instanceof EventLogbookError) {
    return { status: err.status, error: err.message, errorCode: err.status === 409 ? 'EVENT_CONFLICT' : 'EVENT_REJECTED', retryable: false };
  }

  const code = codeOf(err);
  const msg = messageOf(err);

  if (code === 'P2002') {
    return {
      status: 409,
      error: 'An event with the same stream_id, session_id, track_id, event_type and timestamp already exists.',
      errorCode: 'EVENT_CONFLICT',
      retryable: false,
    };
  }

  // A table or column the code expects is not in the database: a migration has not been run.
  if (code === 'P2021' || code === 'P2022' || code === '42P01' || code === '42703' || /(relation|column|table) .*does not exist|does not exist in the current database/i.test(msg)) {
    return {
      status: 500,
      error: `The server database is not up to date with this version of the API (a required table or column is missing). Ask the ReADI administrator to run the pending database migrations. Reference: ${reference}`,
      errorCode: 'DB_SCHEMA_OUTDATED',
      retryable: false,
      reference,
    };
  }

  if ((code && (UNREACHABLE_PRISMA.has(code) || UNREACHABLE_NODE.has(code))) || /can't reach database server|connection (terminated|refused)|timed out fetching a new connection/i.test(msg)) {
    return {
      status: 503,
      error: 'The server database is temporarily unavailable. Send the same request again in a moment.',
      errorCode: 'DB_UNAVAILABLE',
      retryable: true,
      reference,
    };
  }

  return {
    status: 500,
    error: `The event could not be stored because of an unexpected server error. Reference: ${reference}`,
    errorCode: 'STORE_FAILED',
    retryable: true,
    reference,
  };
}
