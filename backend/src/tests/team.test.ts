/**
 * Integration tests for team user management API endpoints.
 * Routes are called directly. getUserSession is mocked to skip the real
 * auth chain (that is fully covered in auth.test.ts).
 *
 * Run:  npm test -- team
 */

import {
  clearAllCookies,
  makeRequest,
  parseJson,
  makeSession,
} from './helpers';

import { POST as listUsersPOST }    from '@/app/api/team/user/list/route';
import { POST as addUserPOST }      from '@/app/api/team/user/add/route';
import { POST as updateUserPOST }   from '@/app/api/team/user/update/route';
import { DELETE as deleteUserDELETE } from '@/app/api/team/user/delete/route';

// ─── next/headers mock ────────────────────────────────────────────────────────

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockImplementation(async () => {
    const store = (global as any).__cookieStore as Map<string, string>;
    return {
      get:    (n: string) => store.has(n) ? { name: n, value: store.get(n)! } : undefined,
      set:    (n: string, v: string, o?: any) => {
                if (!v || o?.maxAge === 0) store.delete(n); else store.set(n, v);
              },
      delete: (n: string) => store.delete(n),
      has:    (n: string) => store.has(n),
    };
  }),
  headers: jest.fn().mockImplementation(async () => new Headers()),
}));

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, cache: (fn: any) => fn };
});

// ─── Auth session mock ─────────────────────────────────────────────────────────
// We mock getUserSession directly so tests control who is "logged in"
// without needing a valid JWT or real DB user.
// Factory must be self-contained (no external variable refs — jest.mock is hoisted).

jest.mock('@/lib/auth/server-session', () => ({
  getUserSession: jest.fn(),
}));

const { getUserSession: mockGetUserSession } = jest.requireMock('@/lib/auth/server-session') as {
  getUserSession: jest.Mock;
};

// ─── Service / infra mocks ────────────────────────────────────────────────────

jest.mock('@/backend/config/env', () => ({
  env: { APP_URL: 'http://localhost:3000', JWT_SECRET: process.env.JWT_SECRET_KEY },
}));

jest.mock('@/lib/s3Client', () => ({
  getPresignedDownloadUrl: jest.fn().mockResolvedValue(null),
}));

// Audit log — do not write to DB during unit/integration tests
jest.mock('@/backend/services/auditLog/audit-log', () => ({
  logEvent: jest.fn(),
}));

// Supabase — only needed for deleteUser's Supabase auth cleanup
jest.mock('@/backend/database/database', () => ({
  supabase: { auth: { admin: { deleteUser: jest.fn().mockResolvedValue({}) } } },
}));

// Email — do not send real emails
jest.mock('../../../lib/resend/mail', () => ({
  sendUserActivationEmail: jest.fn().mockResolvedValue({ message: 'Email sent' }),
}));

// ─── Prisma mock ──────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    public_users:     { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    user_owner:       { create: jest.fn(), updateMany: jest.fn() },
    users_profile:    { create: jest.fn(), update: jest.fn() },
    user_settings:    { create: jest.fn() },
    notification:     { deleteMany: jest.fn() },
    checklist:        { updateMany: jest.fn() },
    kanban:           { updateMany: jest.fn() },
    planning_logbook: { updateMany: jest.fn() },
  },
}));

const { prisma: mockPrisma }   = jest.requireMock('@/lib/prisma');
const { supabase: mockSupa }   = jest.requireMock('@/backend/database/database');
const mockDeleteAuthUser       = mockSupa.auth.admin.deleteUser as jest.Mock;

// ─── Test data ────────────────────────────────────────────────────────────────

const ADMIN_SESSION = makeSession({ userId: 1, role: 'ADMIN', ownerId: 10 });
const SUPERADMIN_SESSION = makeSession({ userId: 2, role: 'SUPERADMIN', ownerId: 0 });

const MOCK_USER_ROWS = [
  {
    user_id: 20, username: 'alice', email: 'alice@test.com',
    first_name: 'Alice', last_name: 'Smith',
    phone: '+111', user_active: 'Y', user_role: 'PIC',
    user_unique_code: 'USR-020', auth_user_id: 'auth-20',
    is_viewer: 'N', is_manager: 'N',
    fk_owner_id: 10, fk_client_id: null, fk_territorial_unit: null,
    fk_user_profile_id: 8,
    users_profile: null, owner: { owner_code: 'O01', owner_name: 'Test Co' },
    owner_territorial_unit_users_fk_territorial_unitToowner_territorial_unit: null,
  },
  {
    user_id: 21, username: 'bob', email: 'bob@test.com',
    first_name: 'Bob', last_name: 'Jones',
    phone: '', user_active: 'N', user_role: 'TM',
    user_unique_code: 'USR-021', auth_user_id: null,
    is_viewer: 'N', is_manager: 'Y',
    fk_owner_id: 10, fk_client_id: null, fk_territorial_unit: null,
    fk_user_profile_id: null,
    users_profile: null, owner: null,
    owner_territorial_unit_users_fk_territorial_unitToowner_territorial_unit: null,
  },
];

// ─── Setup ────────────────────────────────────────────────────────────────────

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
  mockGetUserSession.mockResolvedValue(ADMIN_SESSION);
  mockDeleteAuthUser.mockResolvedValue({});
  mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.checklist.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.kanban.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.planning_logbook.updateMany.mockResolvedValue({ count: 0 });
});

// ─── GET user list ─────────────────────────────────────────────────────────────

describe('POST /api/team/user/list', () => {
  it('returns user list for authenticated ADMIN', async () => {
    mockPrisma.public_users.findMany.mockResolvedValue(MOCK_USER_ROWS);

    const req  = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res  = await listUsersPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(body.status).toBe('SUCCESS');
    expect(body.dataRows).toBe(2);
    expect(body.data).toHaveLength(2);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUserSession.mockResolvedValue(null);

    const req = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res = await listUsersPOST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when role lacks manage_users / view_logs permission', async () => {
    // CLIENT role has neither permission
    mockGetUserSession.mockResolvedValue(makeSession({ role: 'CLIENT' }));

    const req = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res = await listUsersPOST(req);
    expect(res.status).toBe(403);
  });

  it('uses ownerId=0 (all owners) for SUPERADMIN', async () => {
    mockGetUserSession.mockResolvedValue(SUPERADMIN_SESSION);
    mockPrisma.public_users.findMany.mockResolvedValue([]);

    const req = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    await listUsersPOST(req);

    // SUPERADMIN → ownerId=0 → Prisma WHERE has no fk_owner_id filter
    expect(mockPrisma.public_users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ fk_owner_id: expect.anything() }) })
    );
  });
});

// ─── Add user ────────────────────────────────────────────────────────────────

const validAddBody = {
  username: 'charlie',
  fullname: 'Charlie Brown',
  email: 'charlie@test.com',
  phone: '+999',
  profile: 14, // TM
  user_type: 'EMPLOYEE',
  user_viewer: 'N',
  user_manager: 'N',
  timezone: 'UTC',
};

describe('POST /api/team/user/add', () => {
  beforeEach(() => {
    mockPrisma.public_users.findFirst.mockResolvedValue(null); // no existing user
    mockPrisma.public_users.create.mockResolvedValue({ user_id: 200 });
    mockPrisma.user_owner.create.mockResolvedValue({ user_owner_id: 100 });
    mockPrisma.users_profile.create.mockResolvedValue({});
    mockPrisma.user_settings.create.mockResolvedValue({});
  });

  // ── Validation cases (data-driven) ────────────────────────────────────────
  const addValidationCases = [
    {
      case: 'missing username',
      body: { fullname: 'Name', email: 'e@e.com', profile: 8, user_type: 'EMPLOYEE', timezone: 'UTC' },
    },
    {
      case: 'missing email',
      body: { username: 'u', fullname: 'Name', profile: 8, user_type: 'EMPLOYEE', timezone: 'UTC' },
    },
    {
      case: 'missing fullname',
      body: { username: 'u', email: 'e@e.com', profile: 8, user_type: 'EMPLOYEE', timezone: 'UTC' },
    },
  ];

  // These cases exercise that missing fields cause the createUser to fail at the
  // Prisma create step or return an error. We validate the route returns non-200.
  it.each(addValidationCases)('returns error — $case', async ({ body }) => {
    // Force Prisma to reject — simulates required-field DB constraint
    mockPrisma.public_users.create.mockRejectedValue(new Error('null value in column'));

    const req = makeRequest('/api/team/user/add', { method: 'POST', body });
    const res = await addUserPOST(req);
    // Should return 500 (internal) rather than 200 when the create throws
    expect(res.status).not.toBe(200);
  });

  it('creates user and returns 200 with newId', async () => {
    const req  = makeRequest('/api/team/user/add', { method: 'POST', body: validAddBody });
    const res  = await addUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(body.newId).toBe(200);
  });

  it('returns 409 when email already exists', async () => {
    mockPrisma.public_users.findFirst.mockResolvedValue({
      user_id: 50, email: 'charlie@test.com', username: 'other',
      user_active: 'Y', auth_user_id: 'auth-50',
    });

    const req  = makeRequest('/api/team/user/add', { method: 'POST', body: validAddBody });
    const res  = await addUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(409);
    expect(body.status).toBe('ERROR');
  });

  it('returns 409 with PENDING_ACTIVATION status for unactivated duplicate', async () => {
    mockPrisma.public_users.findFirst.mockResolvedValue({
      user_id: 51, email: 'charlie@test.com', username: 'other',
      user_active: 'N', auth_user_id: null,
    });

    const req  = makeRequest('/api/team/user/add', { method: 'POST', body: validAddBody });
    const res  = await addUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(409);
    expect(body.status).toBe('PENDING_ACTIVATION');
    expect(body.pending_user_id).toBe(51);
  });

  it('requires owner_id for SUPERADMIN', async () => {
    mockGetUserSession.mockResolvedValue(SUPERADMIN_SESSION);

    const req  = makeRequest('/api/team/user/add', {
      method: 'POST',
      body: { ...validAddBody }, // no owner_id
    });
    const res  = await addUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(400);
    expect(body.error_list).toContain('owner_id is required');
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUserSession.mockResolvedValue(null);

    const req = makeRequest('/api/team/user/add', { method: 'POST', body: validAddBody });
    const res = await addUserPOST(req);
    expect(res.status).toBe(401);
  });
});

// ─── Update user ──────────────────────────────────────────────────────────────

describe('POST /api/team/user/update', () => {
  beforeEach(() => {
    mockPrisma.public_users.update.mockResolvedValue({});
    mockPrisma.users_profile.update.mockResolvedValue({});
    mockPrisma.user_owner.updateMany.mockResolvedValue({ count: 1 });
  });

  // ── Schema validation cases (data-driven) ────────────────────────────────
  const updateValidationCases = [
    {
      case: 'invalid user_id (string)',
      body: { user_id: 'abc', email: 'e@e.com' },
      expectedStatus: 400,
    },
    {
      case: 'invalid email format',
      body: { user_id: 1, email: 'not-an-email' },
      expectedStatus: 400,
    },
    {
      case: 'invalid active value (not 0 or 1)',
      body: { user_id: 1, email: 'e@e.com', active: 5 },
      expectedStatus: 400,
    },
    {
      case: 'invalid is_viewer value',
      body: { user_id: 1, email: 'e@e.com', is_viewer: 'X' },
      expectedStatus: 400,
    },
  ];

  it.each(updateValidationCases)('returns $expectedStatus — $case', async ({ body, expectedStatus }) => {
    const req = makeRequest('/api/team/user/update', { method: 'POST', body });
    const res = await updateUserPOST(req);
    expect(res.status).toBe(expectedStatus);
  });

  it('updates user fields and returns 200', async () => {
    const req  = makeRequest('/api/team/user/update', {
      method: 'POST',
      body: {
        user_id: 20, email: 'alice.new@test.com', fullname: 'Alice Updated',
        fk_user_profile_id: 9, user_type: 'EMPLOYEE', active: 1,
        is_viewer: 'N', is_manager: 'N',
      },
    });
    const res  = await updateUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(body.status).toBe('SUCCESS');
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUserSession.mockResolvedValue(null);

    const req = makeRequest('/api/team/user/update', {
      method: 'POST',
      body: { user_id: 20, email: 'alice@test.com' },
    });
    const res = await updateUserPOST(req);
    expect(res.status).toBe(401);
  });
});

// ─── Delete user ──────────────────────────────────────────────────────────────

describe('DELETE /api/team/user/delete', () => {
  beforeEach(() => {
    mockPrisma.public_users.findFirst.mockResolvedValue({
      auth_user_id: 'auth-20',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@test.com',
    });
    mockPrisma.public_users.deleteMany.mockResolvedValue({ count: 1 });
  });

  // ── Validation cases (data-driven) ────────────────────────────────────────
  const deleteValidationCases = [
    {
      case: 'missing user_id',
      body: {},
      expectedStatus: 400,
    },
    {
      case: 'user_id is not a positive integer',
      body: { user_id: -1 },
      expectedStatus: 400,
    },
    {
      case: 'user_id is a string',
      body: { user_id: 'twenty' },
      expectedStatus: 400,
    },
  ];

  it.each(deleteValidationCases)('returns $expectedStatus — $case', async ({ body, expectedStatus }) => {
    const req = makeRequest('/api/team/user/delete', { method: 'DELETE', body });
    const res = await deleteUserDELETE(req);
    expect(res.status).toBe(expectedStatus);
  });

  it('deletes user and returns 200 on success', async () => {
    const req  = makeRequest('/api/team/user/delete', {
      method: 'DELETE',
      body: { user_id: 20 },
    });
    const res  = await deleteUserDELETE(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(body.status).toBe('SUCCESS');
  });

  it('returns 404 when user does not belong to this owner', async () => {
    mockPrisma.public_users.findFirst.mockResolvedValue(null);

    const req  = makeRequest('/api/team/user/delete', {
      method: 'DELETE',
      body: { user_id: 9999 },
    });
    const res = await deleteUserDELETE(req);
    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUserSession.mockResolvedValue(null);

    const req = makeRequest('/api/team/user/delete', {
      method: 'DELETE',
      body: { user_id: 20 },
    });
    const res = await deleteUserDELETE(req);
    expect(res.status).toBe(401);
  });
});
