export type ErrorCategory =
  | 'AUTH'
  | 'VALIDATION'
  | 'API'
  | 'DB'
  | 'DCC'
  | 'FILES'
  | 'INTEGRATION'
  | 'UNKNOWN';

export type ErrorCodeEntry = {
  code: string;
  category: ErrorCategory;
  /** Human readable description of where/why this code can be emitted. */
  details: string;
};

/**
 * Central registry of application error codes.
 *
 * Rules:
 * - `code` MUST be 5 characters, alphanumeric only.
 * - Each `code` MUST be unique across the entire codebase.
 * - Prefer one code per concrete handling site (route/module/case).
 */
export const ERROR_CODES = {
  // Auth (session / permission)
  AUTH_NO_SESSION: {
    code: 'AU001',
    category: 'AUTH',
    details: 'No active user session when calling a protected API route.',
  },
  AUTH_FORBIDDEN: {
    code: 'AU002',
    category: 'AUTH',
    details: 'Authenticated user lacks required permission(s) for this API route.',
  },

  // Auth (API keys)
  APIKEY_MISSING_HEADER: {
    code: 'AK001',
    category: 'AUTH',
    details: 'Missing X-API-KEY header on API-key authenticated route.',
  },
  APIKEY_INVALID: {
    code: 'AK002',
    category: 'AUTH',
    details: 'Provided API key hash not found or not matching any active key.',
  },
  APIKEY_REVOKED: {
    code: 'AK003',
    category: 'AUTH',
    details: 'Provided API key exists but has been revoked (is_active = false).',
  },
  APIKEY_EXPIRED: {
    code: 'AK004',
    category: 'AUTH',
    details: 'Provided API key exists but is expired (expires_at in past).',
  },

  // Generic API failures (do not leak internals)
  API_UNHANDLED_SYSTEM_ADD: {
    code: 'AP001',
    category: 'API',
    details: 'Unhandled exception in `POST /api/system/add` route handler.',
  },
} as const satisfies Record<string, ErrorCodeEntry>;

function assertErrorCodesValidAndUnique() {
  const entries = Object.entries(ERROR_CODES);
  const codes = entries.map(([, v]) => v.code);

  for (const [key, v] of entries) {
    if (!/^[A-Za-z0-9]{5}$/.test(v.code)) {
      throw new Error(`Invalid error code for ${key}: "${v.code}" (must be 5 alphanumeric chars)`);
    }
  }

  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const c of codes) {
    if (seen.has(c)) dups.add(c);
    seen.add(c);
  }
  if (dups.size) {
    throw new Error(`Duplicate error codes detected: ${Array.from(dups).join(', ')}`);
  }
}

assertErrorCodesValidAndUnique();

export type ErrorCodeId = keyof typeof ERROR_CODES;
export type ErrorCode = (typeof ERROR_CODES)[ErrorCodeId]['code'];

export function getErrorCodeEntry(id: ErrorCodeId): (typeof ERROR_CODES)[ErrorCodeId] {
  return ERROR_CODES[id];
}

