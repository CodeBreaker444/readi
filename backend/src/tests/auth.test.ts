/**
 * Integration tests for the auth API endpoints.
 * Route handlers are imported and called directly — no HTTP server needed.
 * Prisma is mocked so no real database is required.
 *
 * Run:  npm test -- auth
 */

import { clearAllCookies, getCookieStore, makeRequest, parseJson } from './helpers';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST, GET as logoutGET } from '@/app/api/auth/logout/route';

// ─── next/headers mock ────────────────────────────────────────────────────────
// Must be at the top of the file so Jest hoisting picks it up.
// The factory accesses global.__cookieStore at CALL TIME (not at hoist time),
// so it correctly uses the store initialised in jest.setup.ts.

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockImplementation(async () => {
    const store = (global as any).__cookieStore as Map<string, string>;
    return {
      get:    (name: string) =>
                store.has(name) ? { name, value: store.get(name)! } : undefined,
      set:    (name: string, value: string, opts?: any) => {
                if (!value || opts?.maxAge === 0) store.delete(name);
                else store.set(name, value);
              },
      delete: (name: string) => store.delete(name),
      has:    (name: string) => store.has(name),
    };
  }),
  headers: jest.fn().mockImplementation(async () => new Headers()),
}));

// React cache must be a passthrough in Jest — server-session.ts wraps getUserSession with it
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, cache: (fn: any) => fn };
});

// Backend env (avoids reading PEM file and real env vars)
jest.mock('@/backend/config/env', () => ({
  env: {
    JWT_SECRET:   process.env.JWT_SECRET_KEY,
    APP_URL:      'http://localhost:3000',
  },
}));

// S3 — never call real AWS in tests
jest.mock('@/lib/s3Client', () => ({
  getPresignedDownloadUrl: jest.fn().mockResolvedValue(null),
  getPresignedUploadUrl:   jest.fn().mockResolvedValue('http://fake-upload-url'),
}));

// ─── Prisma mock ──────────────────────────────────────────────────────────────
// Factory must be self-contained — jest.mock is hoisted before const declarations.

jest.mock('@/lib/prisma', () => ({
  prisma: {
    public_users:  { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    user_settings: { findFirst: jest.fn() },
    owner:         { findUnique: jest.fn() },
    client:        { findUnique: jest.fn() },
    users_profile: { findUnique: jest.fn() },
  },
}));

const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma');

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  clearAllCookies();
  jest.clearAllMocks();
  // Default: password already changed, no redirect needed
  mockPrisma.user_settings.findFirst.mockResolvedValue({ setting_value: 'true' });
  // Default: active owner
  mockPrisma.owner.findUnique.mockResolvedValue({
    owner_name: 'Test Co', owner_active: 'Y', drone_atc_enabled: false,
  });
  mockPrisma.public_users.update.mockResolvedValue({});
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {

  // ── Missing-field validation (data-driven) ────────────────────────────────
  const missingFieldCases = [
    { case: 'missing email',    body: { password: 'pass123' } },
    { case: 'missing password', body: { email: 'user@test.com' } },
    { case: 'empty body',       body: {} },
  ];

  it.each(missingFieldCases)('returns 400 — $case', async ({ body }) => {
    const req = makeRequest('/api/auth/login', { method: 'POST', body });
    const res = await loginPOST(req);
    expect(res.status).toBe(400);
  });

  // ── Credential failures (data-driven) ─────────────────────────────────────
  const credentialFailureCases = [
    {
      case: 'email not registered',
      setupMock: () => mockPrisma.public_users.findUnique.mockResolvedValue(null),
      expectedStatus: 401,
    },
    {
      case: 'wrong password',
      setupMock: () =>
        mockPrisma.public_users.findUnique.mockResolvedValue({
          user_id: 1, username: 'u', email: 'x@y.com',
          user_active: 'Y', user_role: 'ADMIN',
          // bcrypt hash that will never match 'wrongpassword'
          password_hash: '$2b$10$saltsaltsaltsaltsaltsauInvalidHashThatNeverMatches',
          auth_user_id: 'a1', fk_owner_id: 10, fk_client_id: null,
        }),
      expectedStatus: 401,
    },
  ];

  it.each(credentialFailureCases)('returns $expectedStatus — $case', async ({ setupMock, expectedStatus }) => {
    setupMock();
    const req = makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'any@test.com', password: 'wrongpassword' },
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(expectedStatus);
  });

  it('returns 403 when user account is inactive', async () => {
    // Need a real bcrypt hash to get past the password-check step
    const bcrypt = jest.requireActual<typeof import('bcrypt')>('bcrypt');
    const hash   = await bcrypt.hash('mypassword', 1);

    mockPrisma.public_users.findUnique.mockResolvedValue({
      user_id: 2, username: 'inactive', email: 'inactive@test.com',
      user_active: 'N', user_role: 'PIC',
      password_hash: hash,
      auth_user_id: null, fk_owner_id: 10, fk_client_id: null,
    });

    const req = makeRequest('/api/auth/login', {
      method: 'POST', body: { email: 'inactive@test.com', password: 'mypassword' },
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(403);
  });

  it('sets readi_auth_token cookie and returns user data on success', async () => {
    const bcrypt = jest.requireActual<typeof import('bcrypt')>('bcrypt');
    const hash   = await bcrypt.hash('Secure@1234', 1);

    mockPrisma.public_users.findUnique.mockResolvedValue({
      user_id: 5, username: 'adminuser', email: 'admin@test.com',
      user_active: 'Y', user_role: 'ADMIN',
      password_hash: hash,
      auth_user_id: 'auth-5', fk_owner_id: 10, fk_client_id: null,
    });

    const req = makeRequest('/api/auth/login', {
      method: 'POST', body: { email: 'admin@test.com', password: 'Secure@1234' },
    });

    const res  = await loginPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('admin@test.com');
    expect(body.data.role).toBe('ADMIN');
    // Auth cookie must be set in the cookie store
    expect(getCookieStore().has('readi_auth_token')).toBe(true);
    expect(getCookieStore().get('readi_auth_token')).toBeTruthy();
  });

  it('sets force_pw_change cookie and redirects when password has never been changed', async () => {
    const bcrypt = jest.requireActual<typeof import('bcrypt')>('bcrypt');
    const hash   = await bcrypt.hash('TempPass1', 1);

    mockPrisma.public_users.findUnique.mockResolvedValue({
      user_id: 6, username: 'newuser', email: 'new@test.com',
      user_active: 'Y', user_role: 'PIC',
      password_hash: hash,
      auth_user_id: 'auth-6', fk_owner_id: 10, fk_client_id: null,
    });
    // Simulate password_changed = false (first login)
    mockPrisma.user_settings.findFirst.mockResolvedValue({ setting_value: 'false' });

    const req = makeRequest('/api/auth/login', {
      method: 'POST', body: { email: 'new@test.com', password: 'TempPass1' },
    });

    const res  = await loginPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.redirect).toBe('/auth/change-password');
    expect(getCookieStore().has('force_pw_change')).toBe(true);
  });

  it('returns 403 when owner account is inactive', async () => {
    const bcrypt = jest.requireActual<typeof import('bcrypt')>('bcrypt');
    const hash   = await bcrypt.hash('pass', 1);

    mockPrisma.public_users.findUnique.mockResolvedValue({
      user_id: 7, username: 'u7', email: 'u7@test.com',
      user_active: 'Y', user_role: 'ADMIN',
      password_hash: hash,
      auth_user_id: 'a7', fk_owner_id: 10, fk_client_id: null,
    });
    mockPrisma.owner.findUnique.mockResolvedValue({
      owner_name: 'Suspended Co', owner_active: 'N', drone_atc_enabled: false,
    });

    const req = makeRequest('/api/auth/login', {
      method: 'POST', body: { email: 'u7@test.com', password: 'pass' },
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('clears auth cookie and returns success', async () => {
    // Pre-seed the cookie store as if the user is logged in
    getCookieStore().set('readi_auth_token', 'some-token');
    // getUserSession will try to verify the token — mock the user lookup
    mockPrisma.public_users.findFirst.mockResolvedValue(null); // token invalid → null session OK

    const res  = await logoutPOST();
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Auth cookie should be cleared
    expect(getCookieStore().has('readi_auth_token')).toBe(false);
  });

  it('clears auth cookie even when no session exists', async () => {
    // No cookie at all
    const res = await logoutPOST();
    expect(res.status).toBe(200);
    expect(getCookieStore().has('readi_auth_token')).toBe(false);
  });
});

// ─── GET /api/auth/logout (redirect) ─────────────────────────────────────────

describe('GET /api/auth/logout', () => {
  it('clears auth cookie and returns a redirect to /auth/login', async () => {
    getCookieStore().set('readi_auth_token', 'some-token');

    const req = makeRequest('/api/auth/logout', { method: 'GET' });
    const res = await logoutGET(req);

    expect(res.status).toBe(307); // NextResponse.redirect returns 307 by default
    expect(getCookieStore().has('readi_auth_token')).toBe(false);
  });
});
