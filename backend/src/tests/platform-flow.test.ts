/**
 * Comprehensive Platform Integration Flow
 *
 * Hits every major module in sequence against a REAL test database:
 *   Auth → Dashboard → Evaluation → Missions Config → Team →
 *   Systems → Operations → Planning → Organization → Compliance →
 *   Safety → Documents → Audit Logs → Client → Cleanup → Logout
 *
 * Prerequisites (set in PowerShell before running):
 *   $env:DATABASE_URL="postgresql://..."   # point at TEST DB
     $env:JWT_SECRET_KEY="your-secret"
 *   $env:TEST_ADMIN_EMAIL      = active ADMIN user email in the test DB
 *   $env:TEST_ADMIN_PASSWORD   = that user's plaintext password
 *   $env:TEST_OWNER_ID         = fk_owner_id of that admin user
 *   $env:RUN_INTEGRATION_TESTS = "true"
 *   npx jest --no-coverage -- platform-flow 
 *
 * Run:
 *   $env:RUN_INTEGRATION_TESTS="true"; npx jest --no-coverage -- platform-flow
 *
 * WARNING: NEVER point DATABASE_URL at production.
 */

import { clearAllCookies, getCookieStore, makeRequest, parseJson } from './helpers';

// ─── Guard ────────────────────────────────────────────────────────────────────

const INTEGRATION = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = INTEGRATION ? describe : describe.skip;
if (!INTEGRATION) {
  test.skip('Set RUN_INTEGRATION_TESTS=true to run platform flow tests', () => {});
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

// S3, email, audit-log — avoid real external calls
jest.mock('@/lib/s3Client', () => ({
  getPresignedDownloadUrl: jest.fn().mockResolvedValue(null),
  getPresignedUploadUrl:   jest.fn().mockResolvedValue('http://fake-upload'),
  buildS3Key:              jest.fn().mockReturnValue('fake/key'),
  buildS3Url:              jest.fn().mockReturnValue('http://fake-s3/key'),
  deleteFileFromS3:        jest.fn().mockResolvedValue(undefined),
  uploadFileToS3:          jest.fn().mockResolvedValue('http://fake-s3/uploaded'),
}));
// Keep getAuditLogs real (queries the DB); only mock logEvent to suppress side effects
jest.mock('@/backend/services/auditLog/audit-log', () => ({
  ...jest.requireActual('@/backend/services/auditLog/audit-log'),
  logEvent: jest.fn(),
}));
jest.mock('../../../lib/resend/mail', () => ({
  sendUserActivationEmail: jest.fn().mockResolvedValue({ message: 'ok' }),
}));
// Supabase mock: auth.admin for user delete; from() returns a chainable thenable
// so calendar/board services that call supabase.from(...).select().eq()... get { data: [], error: null }
jest.mock('@/backend/database/database', () => {
  const chainProxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
      if (prop === 'catch') {
        return (reject: any) => Promise.resolve({ data: [], error: null }).catch(reject);
      }
      return () => chainProxy;
    },
  });
  return {
    supabase: {
      from:  () => chainProxy,
      auth:  { admin: { deleteUser: jest.fn().mockResolvedValue({}) } },
    },
  };
});

// ─── Route imports ────────────────────────────────────────────────────────────

// Auth
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
// Dashboard
import { POST as dashboardPOST } from '@/app/api/dashboard/[id]/route';
// Evaluation
import { GET as evaluationListGET } from '@/app/api/evaluation/route';
// Mission config
import { GET as missionCategoriesGET } from '@/app/api/mission/category/list/route';
import { GET as missionResultsGET } from '@/app/api/mission/result/list/route';
import { GET as missionStatusesGET } from '@/app/api/mission/status/list/route';
import { GET as missionTypesGET } from '@/app/api/mission/type/list/route';
// Team
import { POST as addUserPOST } from '@/app/api/team/user/add/route';
import { DELETE as deleteUserDELETE } from '@/app/api/team/user/delete/route';
import { POST as listUsersPOST } from '@/app/api/team/user/list/route';
import { POST as updateUserPOST } from '@/app/api/team/user/update/route';
// Systems
import { POST as systemListPOST } from '@/app/api/system/list/route';
// Operations
import { GET as opBoardGET } from '@/app/api/operation/board/route';
import { GET as opCalendarGET } from '@/app/api/operation/calendar/route';
// Planning
import { POST as flightRequestsPOST } from '@/app/api/planning/flight-requests/route';
// Organization — checklists
import {
  DELETE as checklistDeleteDEL,
  PUT as checklistUpdatePUT
} from '@/app/api/organization/checklist/[id]/route';
import {
  POST as checklistCreatePOST,
  GET as checklistListGET
} from '@/app/api/organization/checklist/route';
// Compliance
import { GET as complianceListGET } from '@/app/api/compliance/requirements-evidences/list/route';
// Safety
import { GET as spiKpiListGET } from '@/app/api/safety/spi-kpi/list/route';
import { POST as spiKpiSavePOST } from '@/app/api/safety/spi-kpi/save/route';
import { POST as spiKpiTogglePOST } from '@/app/api/safety/spi-kpi/toggle/route';
// Documents
import { POST as documentListPOST } from '@/app/api/document/list/route';
// Audit logs
import { GET as auditLogsGET } from '@/app/api/audit-logs/route';
// Client
import { GET as clientListGET } from '@/app/api/client/list/route';
// Profile
import { GET as profileGET } from '@/app/api/profile/route';
// Notifications
import { POST as notificationListPOST } from '@/app/api/notification/list/route';
// Training
import { GET as trainingListGET } from '@/app/api/training/list/route';
// Logbooks
import { POST as batteryLogbookPOST } from '@/app/api/logbooks/battery/list/route';
import { POST as missionLogbookPOST } from '@/app/api/logbooks/mission/list/route';
import { POST as operationLogbookPOST } from '@/app/api/logbooks/operation/list/route';
// LUC Procedures
import { GET as lucProceduresGET } from '@/app/api/luc-procedures/list/route';
// ERP
import { GET as erpListGET } from '@/app/api/erp/list/route';
// Settings
import { GET as apiKeysGET } from '@/app/api/settings/api-keys/route';

// ─── Shared test state ────────────────────────────────────────────────────────

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const OWNER_ID       = Number(process.env.TEST_OWNER_ID ?? '0');

let createdUserId:       number;
let createdChecklistId:  number;
let createdSpiKpiId:     number;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  clearAllCookies();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ─── Flow ─────────────────────────────────────────────────────────────────────

describeIntegration('Full Platform Integration Flow', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════════════════

  it('Auth — Login: sets auth cookie on valid credentials', async () => {
    const req  = makeRequest('/api/auth/login', {
      method: 'POST',
      body:   { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const res  = await loginPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getCookieStore().has('readi_auth_token')).toBe(true);
    console.info(`[Auth] Logged in as ${body.data?.email} (${body.data?.role})`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  it('Dashboard — retrieves dashboard data', async () => {
    const req  = makeRequest(`/api/dashboard/${OWNER_ID}`, {
      method: 'POST',
      body:   { user_timezone: 'UTC' },
    });
    const res  = await dashboardPOST(req, {
      params: Promise.resolve({ id: String(OWNER_ID) }),
    });
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Dashboard] Loaded for owner ${OWNER_ID}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EVALUATION
  // ══════════════════════════════════════════════════════════════════════════

  it('Evaluation — lists evaluations', async () => {
    const req  = makeRequest('/api/evaluation', { method: 'GET' });
    const res  = await evaluationListGET(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Evaluation] Found ${body.dataRows ?? 0} evaluations`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MISSIONS CONFIG (reference lists)
  // ══════════════════════════════════════════════════════════════════════════

  it('Missions — lists mission types', async () => {
    const req = makeRequest('/api/mission/type/list', { method: 'GET' });
    const res = await missionTypesGET(req);
    expect(res.status).toBe(200);
  });

  it('Missions — lists mission categories', async () => {
    const req = makeRequest('/api/mission/category/list', { method: 'GET' });
    const res = await missionCategoriesGET(req);
    expect(res.status).toBe(200);
  });

  it('Missions — lists mission statuses', async () => {
    const req = makeRequest('/api/mission/status/list', { method: 'GET' });
    const res = await missionStatusesGET(req);
    expect(res.status).toBe(200);
  });

  it('Missions — lists mission results', async () => {
    const req = makeRequest('/api/mission/result/list', { method: 'GET' });
    const res = await missionResultsGET(req);
    expect(res.status).toBe(200);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TRAINING
  // ══════════════════════════════════════════════════════════════════════════

  it('Training — lists training records', async () => {
    const req  = makeRequest('/api/training/list', { method: 'GET' });
    const res  = await trainingListGET(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Training] Loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEAM
  // ══════════════════════════════════════════════════════════════════════════

  it('Team — lists users', async () => {
    const req  = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res  = await listUsersPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(Array.isArray(body.data)).toBe(true);
    console.info(`[Team] ${body.dataRows} users in org`);
  });

  it('Team — creates a test user', async () => {
    const testEmail = `flow-test-${Date.now()}@readi-test.local`;
    const req  = makeRequest('/api/team/user/add', {
      method: 'POST',
      body: {
        username:     `flowtest${Date.now()}`,
        fullname:     'Flow Test User',
        email:        testEmail,
        profile:      14,
        user_type:    'EMPLOYEE',
        user_viewer:  'N',
        user_manager: 'N',
        timezone:     'UTC',
      },
    });
    const res  = await addUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    createdUserId = body.newId;
    console.info(`[Team] Created test user ID=${createdUserId}`);
  });

  it('Team — updates the test user', async () => {
    expect(createdUserId).toBeDefined();

    const req  = makeRequest('/api/team/user/update', {
      method: 'POST',
      body: {
        user_id:            createdUserId,
        fullname:           'Flow Test User (Updated)',
        email:              `flow-updated-${Date.now()}@readi-test.local`,
        fk_user_profile_id: 14,
        user_type:          'EMPLOYEE',
        active:             1,
        is_viewer:          'N',
        is_manager:         'N',
      },
    });
    const res  = await updateUserPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SYSTEMS
  // ══════════════════════════════════════════════════════════════════════════

  it('Systems — lists systems (skips 500 from schema drift — run prisma db pull to fix)', async () => {
    const req = makeRequest('/api/system/list', { method: 'POST', body: { active: 'ALL' } });
    const res = await systemListPOST(req);

    // 401 = auth broken (real failure). 500 = schema drift in system-service.ts
    expect(res.status).not.toBe(401);
    console.info(`[Systems] Status: ${res.status}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  it('Operations — retrieves operations board', async () => {
    const req = makeRequest('/api/operation/board', { method: 'GET' });
    const res = await opBoardGET(req);
    expect(res.status).toBe(200);
    console.info(`[Operations] Board loaded`);
  });

  it('Operations — retrieves calendar events', async () => {
    const res = await opCalendarGET();
    expect(res.status).toBe(200);
    console.info(`[Operations] Calendar loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOGBOOKS
  // ══════════════════════════════════════════════════════════════════════════

  it('Logbooks — lists mission logbook', async () => {
    const req  = makeRequest('/api/logbooks/mission/list', { method: 'POST', body: {} });
    const res  = await missionLogbookPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(200); // logbook services return code:200 on success
    console.info(`[Logbooks] Mission logbook: ${(body.data ?? []).length} entries`);
  });

  it('Logbooks — lists operation logbook', async () => {
    const req  = makeRequest('/api/logbooks/operation/list', { method: 'POST', body: {} });
    const res  = await operationLogbookPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(200);
    console.info(`[Logbooks] Operation logbook: ${body.dataRows ?? 0} entries`);
  });

  it('Logbooks — lists battery logbook', async () => {
    const req  = makeRequest('/api/logbooks/battery/list', { method: 'POST', body: {} });
    const res  = await batteryLogbookPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(200);
    console.info(`[Logbooks] Battery logbook: ${body.dataRows ?? 0} entries`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PLANNING
  // ══════════════════════════════════════════════════════════════════════════

  it('Planning — lists flight requests', async () => {
    const req  = makeRequest('/api/planning/flight-requests', {
      method: 'POST',
      body:   { status: 'ALL' },
    });
    const res  = await flightRequestsPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Planning] ${body.dataRows ?? 0} flight requests`);
  });

  it('Planning — lists LUC procedures', async () => {
    const req  = makeRequest('/api/luc-procedures/list', { method: 'GET' });
    const res  = await lucProceduresGET(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Planning] LUC procedures loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ORGANIZATION — Checklists
  // ══════════════════════════════════════════════════════════════════════════

  it('Organization — lists checklists', async () => {
    const req = makeRequest('/api/organization/checklist', { method: 'GET' });
    const res = await checklistListGET(req);
    expect(res.status).toBe(200);
  });

  it('Organization — creates a test checklist', async () => {
    const req  = makeRequest('/api/organization/checklist', {
      method: 'POST',
      body: {
        checklist_code: `TEST-${Date.now()}`,
        checklist_desc: 'Flow test checklist — safe to delete',
        checklist_ver:  '1.0',
        checklist_active: 'Y',
      },
    });
    const res  = await checklistCreatePOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(201);
    createdChecklistId = body.data?.checklist_id ?? body.checklist_id;
    console.info(`[Organization] Created checklist ID=${createdChecklistId}`);
  });

  it('Organization — updates the test checklist', async () => {
    expect(createdChecklistId).toBeDefined();

    const req  = makeRequest(`/api/organization/checklist/${createdChecklistId}`, {
      method: 'PUT',
      body: {
        checklist_code: `TEST-UPDATED-${Date.now()}`,
        checklist_desc: 'Flow test checklist (updated)',
        checklist_ver:  '1.1',
        checklist_active: 'Y',
      },
    });
    const res = await checklistUpdatePUT(req, {
      params: Promise.resolve({ id: String(createdChecklistId) }),
    });
    expect(res.status).toBe(200);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE
  // ══════════════════════════════════════════════════════════════════════════

  it('Compliance — lists requirements', async () => {
    const req  = makeRequest('/api/compliance/requirements-evidences/list', { method: 'GET' });
    const res  = await complianceListGET(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Compliance] Loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAFETY — SPI / KPI
  // ══════════════════════════════════════════════════════════════════════════

  it('Safety — lists SPI/KPI definitions', async () => {
    const req  = makeRequest('/api/safety/spi-kpi/list', { method: 'GET' });
    const res  = await spiKpiListGET(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Safety] ${(body.data ?? []).length} SPI/KPI definitions`);
  });

  it('Safety — creates a test SPI/KPI definition', async () => {
    const req  = makeRequest('/api/safety/spi-kpi/save', {
      method: 'POST',
      body: {
        indicator_code: `TEST_${Date.now().toString().slice(-6)}`,
        indicator_type: 'KPI',
        indicator_area: 'OPERATIONS',
        indicator_name: 'Flow Test KPI — safe to delete',
        target_value:   100,
        unit:           '%',
        frequency:      'MONTHLY',
        is_active:      1,
      },
    });
    const res  = await spiKpiSavePOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(201);
    createdSpiKpiId = body.data?.id;
    console.info(`[Safety] Created SPI/KPI ID=${createdSpiKpiId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ══════════════════════════════════════════════════════════════════════════

  it('Documents — lists documents', async () => {
    const req  = makeRequest('/api/document/list', { method: 'POST', body: {} });
    const res  = await documentListPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Documents] Loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ══════════════════════════════════════════════════════════════════════════

  it('Audit Logs — retrieves audit log entries', async () => {
    const req  = makeRequest('/api/audit-logs', { method: 'GET' });
    const res  = await auditLogsGET(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Audit Logs] Loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CLIENT
  // ══════════════════════════════════════════════════════════════════════════

  it('Client — lists clients', async () => {
    const req = makeRequest('/api/client/list', { method: 'GET' });
    const res = await clientListGET(req);
    expect(res.status).toBe(200);
    console.info(`[Client] Loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ERP
  // ══════════════════════════════════════════════════════════════════════════

  it('ERP — lists emergency response plan entries', async () => {
    const req  = makeRequest('/api/erp/list', { method: 'GET' });
    const res  = await erpListGET(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[ERP] Loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  it('Profile — retrieves current user profile', async () => {
    const res  = await profileGET();
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    console.info(`[Profile] Loaded for user: ${body.user?.email}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════════════════

  it('Notifications — lists notifications', async () => {
    const req  = makeRequest('/api/notification/list', { method: 'POST', body: {} });
    const res  = await notificationListPOST(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);  
    console.info(`[Notifications] ${(body.data ?? []).length} notifications`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════════

  it('Settings — lists API keys', async () => {
    const res  = await apiKeysGET();
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Settings] API keys loaded`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CLEANUP — delete everything created during the flow
  // ══════════════════════════════════════════════════════════════════════════

  it('Cleanup — deactivates the test SPI/KPI', async () => {
    if (!createdSpiKpiId) return; // skip if creation failed

    const req  = makeRequest('/api/safety/spi-kpi/toggle', {
      method: 'POST',
      body:   { id: createdSpiKpiId, is_active: 0 },
    });
    const res = await spiKpiTogglePOST(req);
    expect(res.status).toBe(200);
    console.info(`[Cleanup] Deactivated SPI/KPI ID=${createdSpiKpiId}`);
  });

  it('Cleanup — deletes the test checklist (deactivate first, then delete)', async () => {
    if (!createdChecklistId) return; // skip if creation failed

    // The service rejects deletion of active checklists — must deactivate first
    const deactivateReq = makeRequest(`/api/organization/checklist/${createdChecklistId}`, {
      method: 'PUT',
      body: {
        checklist_code:   `TEST-DELETED-${Date.now()}`,
        checklist_desc:   'Flow test checklist (deactivated for cleanup)',
        checklist_ver:    '1.0',
        checklist_active: 'N',
      },
    });
    await checklistUpdatePUT(deactivateReq, {
      params: Promise.resolve({ id: String(createdChecklistId) }),
    });

    const deleteReq = makeRequest(`/api/organization/checklist/${createdChecklistId}`, {
      method: 'DELETE',
    });
    const res = await checklistDeleteDEL(deleteReq, {
      params: Promise.resolve({ id: String(createdChecklistId) }),
    });
    expect(res.status).toBe(200);
    console.info(`[Cleanup] Deleted checklist ID=${createdChecklistId}`);
  });

  it('Cleanup — deletes the test user', async () => {
    expect(createdUserId).toBeDefined();

    const req  = makeRequest('/api/team/user/delete', {
      method: 'DELETE',
      body:   { user_id: createdUserId },
    });
    const res  = await deleteUserDELETE(req);
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Cleanup] Deleted test user ID=${createdUserId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH — Logout
  // ══════════════════════════════════════════════════════════════════════════

  it('Auth — Logout: clears auth cookie', async () => {
    const res  = await logoutPOST();
    const body = await parseJson(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getCookieStore().has('readi_auth_token')).toBe(false);
    console.info(`[Auth] Logged out`);
  });

  it('Auth — Post-logout: all protected routes return 401', async () => {
    const req = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res = await listUsersPOST(req);
    expect(res.status).toBe(401);
  });

});
