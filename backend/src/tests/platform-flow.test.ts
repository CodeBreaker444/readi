/**
 * End-to-end integration test — runs against a REAL test database.
 *
 * This test follows the full platform flow:
 *   Login → Dashboard → User List → Create User → Update User → Delete User → Logout
 *
 * Prerequisites
 * ─────────────
 * Set these environment variables before running (create a .env.test file or
 * export them in your shell):
 *
 *   DATABASE_URL          Connection string to the TEST database (NOT production)
 *   JWT_SECRET_KEY        Must match the value in your .env
 *   TEST_ADMIN_EMAIL      Email of an existing active ADMIN user in the test DB
 *   TEST_ADMIN_PASSWORD   That user's plaintext password
 *   TEST_OWNER_ID         The owner_id of the org that admin belongs to
 *
 * Run ONLY this file:
 *   npm test -- platform-flow
 *
 * Skip (default) / Run:
 *   RUN_INTEGRATION_TESTS=true npm test -- platform-flow
 *
 * WARNING: This test creates and then deletes a real user in the test database.
 *          NEVER point DATABASE_URL at your production database.
 */

import {
  clearAllCookies,
  getCookieStore,
  makeRequest,
  parseJson,
} from './helpers';

// ─── Guard — skip unless explicitly enabled ───────────────────────────────────

const INTEGRATION = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = INTEGRATION ? describe : describe.skip;

if (!INTEGRATION) {
  // Print a clear message when the suite is skipped
  test.skip('Platform flow tests require RUN_INTEGRATION_TESTS=true', () => {});
}

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

// S3 — avoid real AWS calls; avatar URLs will return null
jest.mock('@/lib/s3Client', () => ({
  getPresignedDownloadUrl: jest.fn().mockResolvedValue(null),
  getPresignedUploadUrl:   jest.fn().mockResolvedValue('http://fake-upload'),
}));

// Audit log — write to console only, not DB (keeps the test DB clean)
jest.mock('@/backend/services/auditLog/audit-log', () => ({
  logEvent: jest.fn(),
}));

// Email — never send real emails during tests
jest.mock('../../../lib/resend/mail', () => ({
  sendUserActivationEmail: jest.fn().mockResolvedValue({ message: 'ok' }),
}));

// Supabase — mock auth.admin.deleteUser; real Prisma handles all other DB ops
jest.mock('@/backend/database/database', () => ({
  supabase: { auth: { admin: { deleteUser: jest.fn().mockResolvedValue({}) } } },
}));

// ─── Route imports (must come after mocks) ────────────────────────────────────

import { POST as loginPOST }          from '@/app/api/auth/login/route';
import { POST as logoutPOST }         from '@/app/api/auth/logout/route';
import { POST as listUsersPOST }      from '@/app/api/team/user/list/route';
import { POST as addUserPOST }        from '@/app/api/team/user/add/route';
import { POST as updateUserPOST }     from '@/app/api/team/user/update/route';
import { DELETE as deleteUserDELETE } from '@/app/api/team/user/delete/route';
import { POST as systemListPOST }     from '@/app/api/system/list/route';

// ─── Test state (shared across the flow) ─────────────────────────────────────

let createdUserId: number;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(async () => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  clearAllCookies();
});

// ─── Full platform flow ───────────────────────────────────────────────────────

describeIntegration('Full Platform Integration Flow', () => {
  const email    = process.env.TEST_ADMIN_EMAIL    ?? '';
  const password = process.env.TEST_ADMIN_PASSWORD ?? '';
  const ownerId  = Number(process.env.TEST_OWNER_ID ?? '0');

  // ── Step 1: Login ──────────────────────────────────────────────────────────
  it('Step 1 — Login: sets auth cookie on valid credentials', async () => {
    const req  = makeRequest('/api/auth/login', { method: 'POST', body: { email, password } });
    const res  = await loginPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Auth cookie must be set for all subsequent steps
    expect(getCookieStore().has('readi_auth_token')).toBe(true);
    console.info(`[Flow] Logged in as ${body.data?.email} (${body.data?.role})`);
  });

  // ── Step 2: Dashboard ─────────────────────────────────────────────────────
  it('Step 2 — Dashboard: returns dashboard data for authenticated user', async () => {
    // Dashboard route: POST /api/dashboard/[id]
    // Import inline to avoid issues when tests are skipped
    const { POST: dashPOST } = await import('@/app/api/dashboard/[id]/route');

    const req = makeRequest(`/api/dashboard/${ownerId}`, {
      method: 'POST',
      body: { user_timezone: 'UTC' },
    });
    const res  = await dashPOST(req, { params: Promise.resolve({ id: String(ownerId) }) });
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  // ── Step 3: User list ─────────────────────────────────────────────────────
  it('Step 3 — Team: retrieves the user list', async () => {
    const req  = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res  = await listUsersPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(Array.isArray(body.data)).toBe(true);
    console.info(`[Flow] User list has ${body.dataRows} users`);
  });

  // ── Step 4: Create user ───────────────────────────────────────────────────
  it('Step 4 — Team: creates a test user', async () => {
    const testEmail = `flow-test-${Date.now()}@readi-test.local`;

    const req  = makeRequest('/api/team/user/add', {
      method: 'POST',
      body: {
        username:  `flowtest${Date.now()}`,
        fullname:  'Flow Test User',
        email:     testEmail,
        profile:   14,          // TM
        user_type: 'EMPLOYEE',
        user_viewer:  'N',
        user_manager: 'N',
        timezone:  'UTC',
      },
    });
    const res  = await addUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(typeof body.newId).toBe('number');
    createdUserId = body.newId;
    console.info(`[Flow] Created test user ID=${createdUserId}`);
  });

  // ── Step 5: Update user ───────────────────────────────────────────────────
  it('Step 5 — Team: updates the test user', async () => {
    expect(createdUserId).toBeDefined();

    const req  = makeRequest('/api/team/user/update', {
      method: 'POST',
      body: {
        user_id:           createdUserId,
        fullname:          'Flow Test User (Updated)',
        email:             `flow-test-${Date.now()}@readi-test.local`,
        fk_user_profile_id: 14,
        user_type:         'EMPLOYEE',
        active:            1,
        is_viewer:         'N',
        is_manager:        'N',
      },
    });
    const res  = await updateUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  // ── Step 6: System list ───────────────────────────────────────────────────
  it('Step 6 — Systems: retrieves the system list', async () => {
    const req  = makeRequest('/api/system/list', { method: 'POST', body: { active: 'ALL' } });
    const res  = await systemListPOST(req);
    const body = await parseJson(res);

    // Either success or empty list — both are valid
    expect([200]).toContain(res.status);
    console.info(`[Flow] System list returned status ${res.status}`);
  });

  // ── Step 7: Delete the created user (cleanup) ────────────────────────────
  it('Step 7 — Cleanup: deletes the test user created in Step 4', async () => {
    expect(createdUserId).toBeDefined();

    const req  = makeRequest('/api/team/user/delete', {
      method: 'DELETE',
      body: { user_id: createdUserId },
    });
    const res  = await deleteUserDELETE(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Flow] Deleted test user ID=${createdUserId}`);
  });

  // ── Step 8: Logout ────────────────────────────────────────────────────────
  it('Step 8 — Logout: clears auth cookie', async () => {
    const res  = await logoutPOST();
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getCookieStore().has('readi_auth_token')).toBe(false);
    console.info('[Flow] Logged out successfully');
  });

  // ── Step 9: Confirm protected routes return 401 after logout ─────────────
  it('Step 9 — Post-logout: protected routes return 401', async () => {
    const req = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res = await listUsersPOST(req);
    expect(res.status).toBe(401);
  });
});
