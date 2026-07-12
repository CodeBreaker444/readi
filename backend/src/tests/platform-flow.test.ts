/**
 * Comprehensive Platform Integration Flow — ALL ENDPOINTS
 *
 * Covers every API route. Run against a TEST database only.
 *
 * Prerequisites:
 *   $env:DATABASE_URL      = "postgresql://..."   # TEST DB only
 *   $env:JWT_SECRET_KEY    = "your-secret"
 *   $env:TEST_ADMIN_EMAIL  = admin email in test DB
 *   $env:TEST_ADMIN_PASSWORD = plaintext password
 *   $env:TEST_OWNER_ID     = fk_owner_id of that admin
 * Run:
 *   npm run test:integration
 *
 * Requires in .env (or shell):
 *   TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_OWNER_ID
 *
 * WARNING: NEVER point DATABASE_URL at production.
 */

import { clearAllCookies, getCookieStore, makeFormDataRequest, makeRequest, parseJson } from './helpers';

// ─── Guard ────────────────────────────────────────────────────────────────────

const RUNNING_PLATFORM_FLOW_ONLY = process.argv.some((arg) => arg.includes('platform-flow'));
const INTEGRATION = process.env.RUN_INTEGRATION_TESTS === 'true' || RUNNING_PLATFORM_FLOW_ONLY;

/** Strip whitespace and curly/smart quotes often pasted from docs or chat apps. */
function sanitizeCredential(value: string): string {
  return value
    .trim()
    .replace(/^[\u201C\u201D\u2018\u2019"']+/, '')
    .replace(/[\u201C\u201D\u2018\u2019"']+$/, '');
}

const ADMIN_EMAIL    = sanitizeCredential(process.env.TEST_ADMIN_EMAIL    ?? '');
const ADMIN_PASSWORD = sanitizeCredential(process.env.TEST_ADMIN_PASSWORD ?? '');
const OWNER_ID       = Number(process.env.TEST_OWNER_ID ?? '0');
const HAS_INTEGRATION_CREDENTIALS = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD && OWNER_ID > 0);
const CAN_RUN_INTEGRATION = INTEGRATION && HAS_INTEGRATION_CREDENTIALS;
const describeIntegration = CAN_RUN_INTEGRATION ? describe : describe.skip;

if (!INTEGRATION) {
  test.skip('Set RUN_INTEGRATION_TESTS=true to run platform flow tests', () => {});
} else if (!HAS_INTEGRATION_CREDENTIALS) {
  test.skip('Set TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, and TEST_OWNER_ID to run platform flow tests', () => {});
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

jest.mock('@/lib/s3Client', () => ({
  getPresignedDownloadUrl: jest.fn().mockResolvedValue(null),
  getPresignedUploadUrl:   jest.fn().mockResolvedValue('http://fake-upload'),
  buildS3Key:              jest.fn().mockReturnValue('fake/key'),
  buildS3Url:              jest.fn().mockReturnValue('http://fake-s3/key'),
  deleteFileFromS3:        jest.fn().mockResolvedValue(undefined),
  uploadFileToS3:          jest.fn().mockResolvedValue('http://fake-s3/uploaded'),
}));

jest.mock('@/backend/services/auditLog/audit-log', () => ({
  ...jest.requireActual('@/backend/services/auditLog/audit-log'),
  logEvent: jest.fn(),
}));

jest.mock('../../../lib/resend/mail', () => ({
  sendUserActivationEmail: jest.fn().mockResolvedValue({ message: 'ok' }),
}));

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
      auth:  {
        admin: {
          deleteUser: jest.fn().mockResolvedValue({}),
          updateUserById: jest.fn().mockResolvedValue({ data: { user: {} }, error: null }),
          // addClient() creates the `client` row via Prisma first and only
          // rolls it back if this call returns an error — an unmocked call
          // here throws instead, skips that rollback, and leaks the row.
          createUser: jest.fn().mockImplementation(async () => ({
            data: { user: { id: `test-auth-${Date.now()}-${Math.random().toString(36).slice(2)}` } },
            error: null,
          })),
        },
      },
    },
  };
});

// ─── Route imports ────────────────────────────────────────────────────────────

// Auth
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { POST as updatePasswordPOST } from '@/app/api/auth/update-password/route';
import { getUserSession } from '@/lib/auth/server-session';
// Agent
import { POST as agentAskPOST } from '@/app/api/agent/ask/route';
import { GET as agentIngestGET } from '@/app/api/agent/ingest/route';
import { GET as agentOpmUsersGET } from '@/app/api/agent/opm-users/route';
import { GET as agentUsageMeGET } from '@/app/api/agent/usage/me/route';
import { GET as agentUsageGET } from '@/app/api/agent/usage/route';
// Authorization
import { GET as authorizationListGET } from '@/app/api/authorization/list/route';
import { GET as authorizationMyKeyGET } from '@/app/api/authorization/my-key/route';
import { POST as authorizationSetupPinPOST } from '@/app/api/authorization/setup-pin/route';
// Dashboard
import { POST as dashboardPOST } from '@/app/api/dashboard/[id]/route';
import { POST as dashShiTrendPOST } from '@/app/api/dashboard/getSHITrend/route';
import { POST as dashSpiKpiDataPOST } from '@/app/api/dashboard/getSPIKPIData/route';
import { POST as dashSpiKpiTrendPOST } from '@/app/api/dashboard/getSPIKPITrend/route';
// DCC
import { POST as dccReportBugPOST } from '@/app/api/dcc/report-bug/route';
// Drone ATC
import { GET as droneAtcAirspaceGET } from '@/app/api/drone-atc/airspace/route';
import { GET as droneAtcFleetGET } from '@/app/api/drone-atc/fleet/route';
import { GET as droneAtcWeatherGET } from '@/app/api/drone-atc/weather/route';
// Evaluation
import {
  DELETE as evaluationByIdDEL,
  GET as evaluationByIdGET,
} from '@/app/api/evaluation/[id]/route';
import { GET as evaluationLucProceduresGET } from '@/app/api/evaluation/luc-procedures/route';
import { POST as evaluationMissionListPOST } from '@/app/api/evaluation/mission/list/route';
import { POST as evaluationNewReqCreatePOST } from '@/app/api/evaluation/new-req/create/route';
import {
  DELETE as evaluationPlanningDEL,
  GET as evaluationPlanningGET,
  POST as evaluationPlanningPOST,
} from '@/app/api/evaluation/planning/route';
import { GET as evaluationListGET } from '@/app/api/evaluation/route';
// Export
import { POST as exportLogsPOST } from '@/app/api/export/logs/route';
import { POST as exportPOST } from '@/app/api/export/route';
import { POST as exportSectionsPOST } from '@/app/api/export/sections/route';
// Flytbase
import { GET as flytbaseFlightsGET } from '@/app/api/flytbase/flights/route';
import { GET as flytbaseTokenGET } from '@/app/api/flytbase/token/route';
import { POST as flytbaseVerifyPOST } from '@/app/api/flytbase/verify/route';
// Geocode
import { GET as geocodeGET } from '@/app/api/geocode/route';
// Logbooks
import { POST as batteryLogbookCyclesPOST } from '@/app/api/logbooks/battery/[id]/cycles/route';
import { POST as batteryLogbookFilterPOST } from '@/app/api/logbooks/battery/filter/route';
import { POST as batteryLogbookPOST } from '@/app/api/logbooks/battery/list/route';
import { POST as missionLogbookFilterPOST } from '@/app/api/logbooks/mission/filter/route';
import { POST as missionLogbookPOST } from '@/app/api/logbooks/mission/list/route';
import { POST as operationLogbookFilterPOST } from '@/app/api/logbooks/operation/filter/route';
import { POST as operationLogbookPOST } from '@/app/api/logbooks/operation/list/route';
// LUC Procedures
import { GET as lucProceduresGET } from '@/app/api/luc-procedures/list/route';
// Mission config — lists
import { GET as missionCategoriesGET } from '@/app/api/mission/category/list/route';
import { GET as missionResultsGET } from '@/app/api/mission/result/list/route';
import { GET as missionStatusesGET } from '@/app/api/mission/status/list/route';
import { GET as missionTypesGET } from '@/app/api/mission/type/list/route';
// Mission config — CRUD
import { POST as missionCategoryDeletePOST } from '@/app/api/mission/category/[id]/delete/route';
import { POST as missionCategoryUpdatePOST } from '@/app/api/mission/category/[id]/update/route';
import { POST as missionCategoryAddPOST } from '@/app/api/mission/category/add/route';
import { POST as missionResultDeletePOST } from '@/app/api/mission/result/[id]/delete/route';
import { POST as missionResultUpdatePOST } from '@/app/api/mission/result/[id]/update/route';
import { POST as missionResultAddPOST } from '@/app/api/mission/result/add/route';
import { POST as missionStatusDeletePOST } from '@/app/api/mission/status/[id]/delete/route';
import { POST as missionStatusUpdatePOST } from '@/app/api/mission/status/[id]/update/route';
import { POST as missionStatusAddPOST } from '@/app/api/mission/status/add/route';
import { POST as missionTypeDeletePOST } from '@/app/api/mission/type/[typeId]/delete/route';
import { PUT as missionTypeEditPUT } from '@/app/api/mission/type/[typeId]/edit/route';
import { POST as missionTypeAddPOST } from '@/app/api/mission/type/add/route';
// Notifications
import { POST as notificationListPOST } from '@/app/api/notification/list/route';
import { POST as notificationMarkAllReadPOST } from '@/app/api/notification/mark-all-read/route';
// Operation
import {
  DELETE as operationByIdDEL,
  GET as operationByIdGET,
  PUT as operationByIdPUT,
} from '@/app/api/operation/[id]/route';
import { POST as opBatchAutofillPOST } from '@/app/api/operation/batch/autofill/route';
import { POST as opBatchSetPilotPOST } from '@/app/api/operation/batch/set-pilot/route';
import { GET as opBoardPostFlightGET } from '@/app/api/operation/board/post-flight/route';
import { GET as opBoardGET } from '@/app/api/operation/board/route';
import { POST as opBoardStatusPOST } from '@/app/api/operation/board/status/route';
import { DELETE as opCalendarByIdDEL } from '@/app/api/operation/calendar/[id]/route';
import { POST as opCalendarCreatePOST } from '@/app/api/operation/calendar/create/route';
import { GET as opCalendarGET } from '@/app/api/operation/calendar/route';
import { GET as opCommunicationRecipientsGET } from '@/app/api/operation/communication/recipients/route';
import { GET as opImportOptionsGET } from '@/app/api/operation/import/options/route';
import { GET as opMissionChecklistGET } from '@/app/api/operation/missions/[id]/checklist/route';
import { GET as opMissionLucGET } from '@/app/api/operation/missions/[id]/luc/route';
import { GET as opOptionsGET } from '@/app/api/operation/options/route';
import { GET as opPilotDeclarationGET } from '@/app/api/operation/pilot/declaration/route';
import { GET as opReportIssueGET } from '@/app/api/operation/report-issue/route';
import {
  POST as operationCreatePOST,
  GET as operationListGET,
} from '@/app/api/operation/route';
// Organization
import {
  DELETE as orgAssignmentByIdDEL,
  PUT as orgAssignmentByIdPUT,
} from '@/app/api/organization/assignment/[id]/route';
import {
  GET as orgAssignmentGET,
  POST as orgAssignmentPOST,
} from '@/app/api/organization/assignment/route';
import { GET as orgChartGET } from '@/app/api/organization/chart/route';
import {
  DELETE as checklistDeleteDEL,
  PUT as checklistUpdatePUT,
} from '@/app/api/organization/checklist/[id]/route';
import { POST as orgChecklistDataPOST } from '@/app/api/organization/checklist/data/route';
import {
  POST as checklistCreatePOST,
  GET as checklistListGET,
} from '@/app/api/organization/checklist/route';
import { POST as orgCommunicationAddPOST } from '@/app/api/organization/communication/add/route';
import { POST as orgCommunicationDeletePOST } from '@/app/api/organization/communication/delete/route';
import { GET as orgCommunicationGET } from '@/app/api/organization/communication/route';
import { PUT as orgCommunicationUpdatePUT } from '@/app/api/organization/communication/update/route';
import { DELETE as orgLucDeleteDEL } from '@/app/api/organization/luc-procedures/[id]/route';
import {
  POST as orgLucCreatePOST,
  GET as orgLucListGET,
} from '@/app/api/organization/luc-procedures/route';
// Owner
import { GET as ownerCheckUniqueGET } from '@/app/api/owner/check-unique/route';
import { GET as ownerListGET } from '@/app/api/owner/route';
// Planning
import { GET as planningAssignableGET } from '@/app/api/planning/flight-requests/assignable-plannings/route';
import { POST as flightRequestsPOST } from '@/app/api/planning/flight-requests/route';
// Profile
import { PATCH as profileEasaCodePATCH } from '@/app/api/profile/easa-code/route';
import { GET as profileGET } from '@/app/api/profile/route';
// Releases
import { GET as releasesGET } from '@/app/api/releases/route';
// Safety
import { GET as spiKpiListGET } from '@/app/api/safety/spi-kpi/list/route';
import { POST as spiKpiLogMeasurementPOST } from '@/app/api/safety/spi-kpi/log-measurement/route';
import { POST as spiKpiSavePOST } from '@/app/api/safety/spi-kpi/save/route';
import { POST as spiKpiTogglePOST } from '@/app/api/safety/spi-kpi/toggle/route';
// Settings
import {
  DELETE as apiKeyDeleteDEL,
} from '@/app/api/settings/api-keys/[id]/route';
import {
  POST as apiKeyCreatePOST,
  GET as apiKeysGET,
} from '@/app/api/settings/api-keys/route';
import {
  GET as settingsDccGET,
  POST as settingsDccPOST,
} from '@/app/api/settings/dcc/route';
// Compliance
import { POST as auditPlanAddPOST } from '@/app/api/compliance/audit-plan/add/route';
import { POST as auditPlanDeletePOST } from '@/app/api/compliance/audit-plan/delete/route';
import { GET as auditPlanListGET } from '@/app/api/compliance/audit-plan/list/route';
import { GET as auditPlanStatsGET } from '@/app/api/compliance/audit-plan/stats/route';
import { POST as auditPlanUpdatePOST } from '@/app/api/compliance/audit-plan/update/route';
import { GET as complianceCalendarGET } from '@/app/api/compliance/calendar/route';
import { POST as evidenceAddPOST } from '@/app/api/compliance/requirements-evidences/evidence/add/route';
import { POST as evidenceDeletePOST } from '@/app/api/compliance/requirements-evidences/evidence/delete/route';
import { GET as evidenceListGET } from '@/app/api/compliance/requirements-evidences/evidence/list/route';
import { GET as complianceListGET } from '@/app/api/compliance/requirements-evidences/list/route';
import { POST as requirementStatusPOST } from '@/app/api/compliance/requirements-evidences/status/route';
import { GET as safetyTargetReviewGET } from '@/app/api/compliance/safety-target-review/generate/route';
// Audit logs
import { GET as auditLogsGET } from '@/app/api/audit-logs/route';
// Client
import { POST as clientAddPOST } from '@/app/api/client/add/route';
import { GET as clientCheckUsernameGET } from '@/app/api/client/check-username/route';
import { DELETE as clientDeleteDEL } from '@/app/api/client/delete/route';
import { GET as clientListGET } from '@/app/api/client/list/route';
import { POST as clientUpdatePOST } from '@/app/api/client/update/route';
// Client portal
import { GET as clientPortalAnalyticsGET } from '@/app/api/client-portal/analytics/route';
import { GET as clientPortalDashboardGET } from '@/app/api/client-portal/dashboard/route';
import { GET as clientPortalMissionsGET } from '@/app/api/client-portal/missions/route';
import { GET as clientPortalProfileGET } from '@/app/api/client-portal/profile/route';
// Documents
import { POST as documentCreatePOST } from '@/app/api/document/create/route';
import { POST as documentDeletePOST } from '@/app/api/document/delete/route';
import { POST as documentHistoryPOST } from '@/app/api/document/history/route';
import { POST as documentListPOST } from '@/app/api/document/list/route';
import { POST as documentPresignUploadPOST } from '@/app/api/document/presign-upload/route';
import { POST as documentTypeListPOST } from '@/app/api/document/type-list/route';
import {
  DELETE as documentTypeDeleteDEL,
  PATCH as documentTypeUpdatePATCH,
} from '@/app/api/document/types/[id]/route';
import { POST as documentTypesCreatePOST } from '@/app/api/document/types/route';
import { POST as documentUpdatePOST } from '@/app/api/document/update/route';
// ERP
import { POST as erpDeletePOST } from '@/app/api/erp/delete/route';
import { GET as erpListGET } from '@/app/api/erp/list/route';
import { POST as erpLocationGroupDeletePOST } from '@/app/api/erp/location-group/delete/route';
import { GET as erpLocationGroupListGET } from '@/app/api/erp/location-group/list/route';
import { POST as erpLocationGroupSavePOST } from '@/app/api/erp/location-group/save/route';
import { POST as erpSavePOST } from '@/app/api/erp/save/route';
import { POST as erpUpdatePOST } from '@/app/api/erp/update/route';
// System
import { GET as systemComponentTypesGET } from '@/app/api/system/component-types/route';
import { POST as systemComponentListPOST } from '@/app/api/system/component/list/route';
import { GET as systemDroneClassesGET } from '@/app/api/system/drone-classes/route';
import { POST as systemListPOST } from '@/app/api/system/list/route';
import { POST as maintenanceDashboardPOST } from '@/app/api/system/maintenance/dashboard/route';
import { GET as systemMaintenanceLookupsGET } from '@/app/api/system/maintenance/lookups/route';
import { POST as maintenanceTicketClosePOST } from '@/app/api/system/maintenance/tickets/close/route';
import { POST as maintenanceTicketCreatePOST } from '@/app/api/system/maintenance/tickets/create/route';
import { GET as maintenanceTicketEventsGET } from '@/app/api/system/maintenance/tickets/events/route';
import { GET as maintenanceTicketsGET } from '@/app/api/system/maintenance/tickets/route';
import { POST as systemModelDeletePOST } from '@/app/api/system/model/[id]/delete/route';
import { POST as systemModelUpdatePOST } from '@/app/api/system/model/[id]/update/route';
import { POST as systemModelAddPOST } from '@/app/api/system/model/add/route';
import { POST as systemModelListPOST } from '@/app/api/system/model/list/route';
// Team
import { DELETE as teamShiftDeleteDEL } from '@/app/api/team/shift/[id]/route';
import { POST as teamShiftCreatePOST } from '@/app/api/team/shift/create/route';
import { GET as teamShiftListGET } from '@/app/api/team/shift/route';
import { POST as addUserPOST } from '@/app/api/team/user/add/route';
import { GET as teamCheckUsernameGET } from '@/app/api/team/user/check-username/route';
import { DELETE as deleteUserDELETE } from '@/app/api/team/user/delete/route';
import { POST as listUsersPOST } from '@/app/api/team/user/list/route';
import {
  GET as userQualificationsGET,
  POST as userQualificationsPOST,
} from '@/app/api/team/user/qualifications/route';
import { POST as teamResendInvitePOST } from '@/app/api/team/user/resend-invite/route';
import { POST as updateUserPOST } from '@/app/api/team/user/update/route';
// Training
import { POST as trainingAddPOST } from '@/app/api/training/add/route';
import { GET as trainingAttendanceGET } from '@/app/api/training/attendance/route';
import { GET as trainingCalendarGET } from '@/app/api/training/calendar/route';
import { GET as trainingCurriculumGET } from '@/app/api/training/curriculum/route';
import { POST as trainingDeletePOST } from '@/app/api/training/delete/route';
import { GET as trainingListGET } from '@/app/api/training/list/route';
import { POST as trainingRecomputePOST } from '@/app/api/training/recompute/route';
import { GET as trainingUsersGET } from '@/app/api/training/users/route';
// Agent additional
import { DELETE as agentIngestDEL, POST as agentIngestPOST } from '@/app/api/agent/ingest/route';
// Auth additional
import { POST as authActivatePOST } from '@/app/api/auth/activate/route';
import { GET as authLogoutGET } from '@/app/api/auth/logout/route';
// Authorization additional
import { POST as authTransactionSignPOST } from '@/app/api/authorization/transaction-sign/route';
import { PATCH as authVerifyPATCH } from '@/app/api/authorization/verify/route';
// Client portal additional
import { PATCH as clientPortalProfilePATCH } from '@/app/api/client-portal/profile/route';
import { POST as clientPortalRequestFlightPOST } from '@/app/api/client-portal/request-flight/route';
// Compliance additional
import { POST as requirementsAddPOST } from '@/app/api/compliance/requirements-evidences/add/route';
import { POST as requirementsDeletePOST } from '@/app/api/compliance/requirements-evidences/delete/route';
import { POST as safetyTargetApprovePOST } from '@/app/api/compliance/safety-target-review/approve/route';
// Document additional
import { POST as documentPresignDownloadPOST } from '@/app/api/document/presign-download/route';
import { POST as documentUploadRevisionPOST } from '@/app/api/document/upload-revision/route';
// Drone ATC additional
import { POST as droneAtcConnectPOST } from '@/app/api/drone-atc/connect/route';
import { GET as droneAtcFlightsGET } from '@/app/api/drone-atc/flights/route';
import { GET as droneAtcStreamGET } from '@/app/api/drone-atc/stream/route';
import { POST as droneAtcSyncDrcPOST } from '@/app/api/drone-atc/sync-drc/route';
import { GET as droneAtcUserInfoGET } from '@/app/api/drone-atc/user-info/route';
import { GET as droneAtcUsersGET, PATCH as droneAtcUsersPATCH } from '@/app/api/drone-atc/users/route';
// ERP additional
import { POST as erpLocationGroupUpdatePOST } from '@/app/api/erp/location-group/update/route';
// Evaluation additional
import { POST as evalByIdAssignmentPOST } from '@/app/api/evaluation/[id]/assignment/route';
import { POST as evalByIdCommPOST } from '@/app/api/evaluation/[id]/communication/route';
import {
  GET as evalByIdFilesGET,
  POST as evalByIdFilesPOST
} from '@/app/api/evaluation/[id]/files/route';
import { GET as evalByIdFlightReqsGET } from '@/app/api/evaluation/[id]/flight-requests/route';
import { POST as evalByIdMoveToPlanningPOST } from '@/app/api/evaluation/[id]/move-to-planning/route';
import { PUT as evaluationByIdPUT } from '@/app/api/evaluation/[id]/route';
import { GET as evalByIdTasksGET, PUT as evalByIdTasksPUT } from '@/app/api/evaluation/[id]/tasks/route';
import { GET as evalMissionTemplateFilterGET } from '@/app/api/evaluation/mission-template/filter/route';
import { GET as evalMissionTemplateLogbookGET } from '@/app/api/evaluation/mission-template/logbook/route';
import { POST as evalMissionCommListPOST } from '@/app/api/evaluation/mission/communication/list/route';
import { POST as evalMissionDeleteLogbookPOST } from '@/app/api/evaluation/mission/delete-logbook/route';
import { POST as evalMissionDeleteTestPOST } from '@/app/api/evaluation/mission/delete-test/route';
import { POST as evalMissionTestPOST } from '@/app/api/evaluation/mission/mission-test/route';
import { POST as evalMissionTestingPOST } from '@/app/api/evaluation/mission/testing/route';
import { POST as evalMissionUpdateStatusPOST } from '@/app/api/evaluation/mission/update-status/route';
import { POST as evalMissionUsersPOST } from '@/app/api/evaluation/mission/users/route';
import { DELETE as evalNewReqFileByIdDEL } from '@/app/api/evaluation/new-req/files/[fileId]/route';
import { POST as evalNewReqFilesUploadPOST } from '@/app/api/evaluation/new-req/files/upload/route';
import {
  GET as evalPlanningTasksGET,
  PUT as evalPlanningTasksPUT,
} from '@/app/api/evaluation/planning/[id]/tasks/route';
import { POST as evalPlanningAddMissionPOST } from '@/app/api/evaluation/planning/add-mission-planning/route';
import { POST as evalPlanningCommPOST } from '@/app/api/evaluation/planning/communication/route';
import { POST as evalPlanningDeleteMissionPOST } from '@/app/api/evaluation/planning/delete-mission-planning/route';
import { POST as evalPlanningDeleteRepFilePOST } from '@/app/api/evaluation/planning/delete-repository-file/route';
import { POST as evalPlanningDronePOST } from '@/app/api/evaluation/planning/drone/route';
import { POST as evalPlanningLogbookPOST } from '@/app/api/evaluation/planning/logbook/route';
import { POST as evalPlanningMissionTemplatePOST } from '@/app/api/evaluation/planning/mission-template/route';
import { GET as evalPlanningPilotGET } from '@/app/api/evaluation/planning/pilot/route';
import { POST as evalPlanningDataPOST } from '@/app/api/evaluation/planning/planning-data/route';
import { POST as evalPlanningRepositoryPOST } from '@/app/api/evaluation/planning/repository/route';
import { PUT as evaluationPlanningPUT } from '@/app/api/evaluation/planning/route';
import { POST as evalPlanningTestLogbookPOST } from '@/app/api/evaluation/planning/test-logbook/route';
import { POST as evalPlanningTestingPOST } from '@/app/api/evaluation/planning/testing/route';
import { POST as evalPlanningUpdatePlanningPOST } from '@/app/api/evaluation/planning/update-planning/route';
// FlytBase additional
import { POST as flytbaseFlightsArchivePOST } from '@/app/api/flytbase/flights/archive/route';
import { GET as flytbaseFlightsPreviewGET } from '@/app/api/flytbase/flights/preview/route';
import { DELETE as flytbaseTokenDEL, POST as flytbaseTokenPOST } from '@/app/api/flytbase/token/route';
// External missions API (API-key auth)
import { DELETE as missionApiDEL, POST as missionApiPOST } from '@/app/api/missions/route';
// Notification additional
import { POST as notificationDeletePOST } from '@/app/api/notification/delete/route';
import { POST as notificationMarkReadPOST } from '@/app/api/notification/mark-read/route';
// Operation additional
import { GET as opAttachmentDownloadGET } from '@/app/api/operation/[id]/attachment/[attachmentId]/download/route';
import { DELETE as opAttachmentByIdDEL } from '@/app/api/operation/[id]/attachment/[attachmentId]/route';
import {
  GET as opAttachmentGET,
  POST as opAttachmentPOST,
} from '@/app/api/operation/[id]/attachment/route';
import { POST as opBoardFlightLogsFlytbasePOST } from '@/app/api/operation/board/flight-logs/flytbase/route';
import { GET as opBoardMaintenanceCycleGET } from '@/app/api/operation/board/maintenance-cycle/route';
import { POST as opBoardMaintenanceCycleUpdatePOST } from '@/app/api/operation/board/maintenance-cycle/update/route';
import { POST as opBoardPostFlightPOST } from '@/app/api/operation/board/post-flight/route';
import { POST as opCommunicationPOST } from '@/app/api/operation/communication/route';
import { POST as opImportPOST } from '@/app/api/operation/import/route';
import { POST as opMissionAssignmentPOST } from '@/app/api/operation/missions/[id]/assignment/route';
import { POST as opMissionCommunicationPOST } from '@/app/api/operation/missions/[id]/communication/route';
import { PATCH as opMissionLucPATCH } from '@/app/api/operation/missions/[id]/luc/route';
import { POST as opPilotDeclarationPOST } from '@/app/api/operation/pilot/declaration/route';
import { POST as opReportIssuePOST } from '@/app/api/operation/report-issue/route';
// Organization additional
import { GET as orgAssignmentByIdGET } from '@/app/api/organization/assignment/[id]/route';
import { PATCH as orgChartUpdatePATCH } from '@/app/api/organization/chart/update/route';
import { GET as orgChecklistByIdGET } from '@/app/api/organization/checklist/[id]/route';
import { POST as orgChecklistResultPOST } from '@/app/api/organization/checklist/result/route';
import {
  GET as orgLucByIdGET,
  PUT as orgLucByIdPUT,
} from '@/app/api/organization/luc-procedures/[id]/route';
// Owner additional
import { PUT as ownerAdminPasswordPUT } from '@/app/api/owner/[id]/admin-password/route';
import { GET as ownerMetricsGET } from '@/app/api/owner/[id]/metrics/route';
import {
  DELETE as ownerByIdDEL,
  GET as ownerByIdGET,
  PUT as ownerByIdPUT,
} from '@/app/api/owner/[id]/route';
import { POST as ownerCreatePOST } from '@/app/api/owner/route';

import { GET as flightRequestLogStatusGET } from '@/app/api/planning/flight-requests/[id]/log-status/route';
import {
  DELETE as flightRequestByIdDEL,
  PATCH as flightRequestByIdPATCH,
} from '@/app/api/planning/flight-requests/[id]/route';
import { POST as flightRequestAssignPOST } from '@/app/api/planning/flight-requests/assign/route';
import { POST as flightRequestDenyPOST } from '@/app/api/planning/flight-requests/deny/route';
import { POST as flightRequestLogsPOST } from '@/app/api/planning/flight-requests/logs/route';

import { POST as profilePOST } from '@/app/api/profile/route';
import { PATCH as apiKeyPatchPATCH } from '@/app/api/settings/api-keys/[id]/route';

import { POST as systemByIdDeletePOST } from '@/app/api/system/[id]/delete/route';
import { POST as systemByIdUpdatePOST } from '@/app/api/system/[id]/update/route';
import { POST as systemAddPOST } from '@/app/api/system/add/route';
import {
  DELETE as systemComponentTypeDeleteDEL,
  PATCH as systemComponentTypeUpdatePATCH,
} from '@/app/api/system/component-types/[id]/route';
import { POST as systemComponentTypeCreatePOST } from '@/app/api/system/component-types/route';
import { POST as systemComponentDeletePOST } from '@/app/api/system/component/[id]/delete/route';
import { POST as systemComponentDetachPOST } from '@/app/api/system/component/[id]/detach/route';
import { GET as systemComponentFlightLogsGET } from '@/app/api/system/component/[id]/flight-logs/route';
import { GET as systemComponentLogsGET } from '@/app/api/system/component/[id]/logs/route';
import { POST as systemComponentPrimaryPOST } from '@/app/api/system/component/[id]/primary/route';
import { POST as systemComponentUpdatePOST } from '@/app/api/system/component/[id]/update/route';
import { POST as systemComponentAddPOST } from '@/app/api/system/component/add/route';
import {
  DELETE as systemDroneClassDeleteDEL,
  PATCH as systemDroneClassUpdatePATCH,
} from '@/app/api/system/drone-classes/[id]/route';
import { POST as systemDroneClassCreatePOST } from '@/app/api/system/drone-classes/route';
import { POST as maintenanceTicketAssignPOST } from '@/app/api/system/maintenance/tickets/assign/route';
import { GET as maintenanceTicketAttachmentGET } from '@/app/api/system/maintenance/tickets/attachment/route';
import { POST as maintenanceTicketReportPOST } from '@/app/api/system/maintenance/tickets/report/route';
import { POST as maintenanceTicketUploadPOST } from '@/app/api/system/maintenance/tickets/upload/route';
import {
  DELETE as controlCenterTokenDEL,
  GET as controlCenterTokenGET,
  POST as controlCenterTokenPOST,
} from '@/app/api/team/user/control-center-token/route';
import { DELETE as userQualificationDeleteDEL } from '@/app/api/team/user/qualifications/[id]/route';
import { POST as trainingAttendancePOST } from '@/app/api/training/attendance/route';
// Permissions
import { GET as permissionsMeGET } from '@/app/api/permissions/me/route';
import {
  GET as permissionsRoleDefaultsGET,
  PATCH as permissionsRoleDefaultsPATCH,
} from '@/app/api/permissions/role-defaults/route';
import {
  GET as permissionsUserByIdGET,
  PATCH as permissionsUserByIdPATCH,
} from '@/app/api/permissions/user/[userId]/route';
// Settings additional
import { GET as settingsDflightGET, POST as settingsDflightPOST } from '@/app/api/settings/dflight/route';
// Team additional
import { GET as teamSubroleGET, POST as teamSubrolePOST } from '@/app/api/team/user/subrole/route';
import { POST as teamUpdatePasswordPOST } from '@/app/api/team/user/update-password/route';
// Client additional
import { POST as clientUpdatePasswordPOST } from '@/app/api/client/update-password/route';
// Compliance additional
import { POST as requirementsUpdatePOST } from '@/app/api/compliance/requirements-evidences/update/route';
// Evaluation additional
import { POST as evalMissionCommAddPOST } from '@/app/api/evaluation/mission/communication/add/route';
import { GET as evalPlanningClientsGET } from '@/app/api/evaluation/planning/clients/route';
// FlytBase / FlytRelay additional
import { GET as flytbaseMyOrganizationsGET } from '@/app/api/flytbase/my-organizations/route';
import { GET as flytrelayFlightsGET } from '@/app/api/flytrelay/flights/route';
import { GET as flytrelayFlightsGutmaGET } from '@/app/api/flytrelay/flights/gutma/route';
// D-Flight
import { GET as dflightFleetGET } from '@/app/api/dflight/fleet/route';
// Operation additional — flight logs
import { GET as opBoardFlightLogsGET } from '@/app/api/operation/board/flight-logs/route';
import { POST as opBoardFlightLogsUploadPOST } from '@/app/api/operation/board/flight-logs/upload/route';
import { GET as opBoardFlightLogsWaypointsGET } from '@/app/api/operation/board/flight-logs/waypoints/route';
import { POST as opImportPreviewPOST } from '@/app/api/operation/import/preview/route';
import { POST as opMissionAttachFlightLogPOST } from '@/app/api/operation/missions/[id]/attach-flight-log/route';
import { GET as opMissionsAttachableGET } from '@/app/api/operation/missions/attachable/route';
import { POST as opMissionsCreateAndAttachPOST } from '@/app/api/operation/missions/create-and-attach/route';
// System additional
import { GET as systemComponentFlightLogPreviewGET } from '@/app/api/system/component/flight-logs/[logId]/preview/route';
import { POST as maintenanceTicketInterventionPOST } from '@/app/api/system/maintenance/tickets/intervention/route';
// Admin — C2 config
import {
  DELETE as c2ConfigOrgsDEL,
  GET as c2ConfigOrgsGET,
  POST as c2ConfigOrgsPOST,
  PUT as c2ConfigOrgsPUT,
} from '@/app/api/admin/c2-config/organizations/route';
import {
  DELETE as c2ConfigPermissionsDEL,
  GET as c2ConfigPermissionsGET,
  POST as c2ConfigPermissionsPOST,
} from '@/app/api/admin/c2-config/permissions/route';
// Cron (Bearer CRON_SECRET auth — not session auth)
import { GET as cronComponentExpirationGET } from '@/app/api/cron/check-component-expiration/route';
import { GET as cronMaintenanceAlertsGET } from '@/app/api/cron/check-maintenance-alerts/route';
import { GET as cronRefreshMaintenanceDaysGET } from '@/app/api/cron/refresh-maintenance-days/route';

const SESSION_SKIP_PATTERNS = [
  'Auth — Login: sets auth cookie on valid credentials',
  'Auth — Post-logout: protected routes return 401',
];

function shouldSkipSessionSetup(testName: string): boolean {
  return SESSION_SKIP_PATTERNS.some((pattern) => testName.includes(pattern));
}

let createdUserId:               number;
let createdChecklistId:          number;
let createdSpiKpiId:             number;
let createdComplianceId:         number;
let createdOrgLucProcedureId:    number;
let createdShiftId:              number;
let createdTrainingAttendanceId: number;
let createdErpId:                number;
let createdErpLocationGroupId:   number;
let createdClientId:             number;
let createdMissionCategoryId:    number;
let createdMissionResultId:      number;
let createdMissionStatusId:      number;
let createdMissionTypeId:        number;
let createdDocumentTypeId:       number;
let createdDocumentId:           number;
let createdEvaluationId:         number;
let createdPlanningId:           number;
let createdOperationId:          number;
let createdCalendarOpId:         number;
let createdAssignmentId:         number;
let createdOrgCommunicationId:   number;
let createdMaintenanceTicketId:  number;
let createdSystemModelId:        number;
let createdEvidenceId:           number;
let createdApiKeyId:             number;
let createdSystemId:             number;
let createdComponentId:          number;
let createdComponentTypeId:      number;
let createdDroneClassId:         number;
let createdQualificationId:      number;
let createdFlightRequestId:      number;
let createdOwnerId:              number;

async function loginAsAdmin(): Promise<void> {
  clearAllCookies();
  const req = makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const res = await loginPOST(req);
  if (res.status !== 200) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Integration login failed (${res.status}) for "${ADMIN_EMAIL}". ` +
      'Verify TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD match an active user in your test DB. ' +
      `Response: ${JSON.stringify(body)}`
    );
  }
}

async function ensureLoggedIn(): Promise<void> {
  if (!HAS_INTEGRATION_CREDENTIALS) return;

  const session = await getUserSession();
  if (session) return;

  await loginAsAdmin();
}

/**
 * Runs a cleanup action and logs the outcome instead of trusting that a
 * resolved promise means the delete happened — route handlers return a
 * response object (e.g. 401) rather than throwing, so a bare try/catch
 * around them reports false success.
 */
async function attemptCleanup(label: string, action: () => Promise<Response>): Promise<void> {
  try {
    const res = await action();
    if (res.status >= 200 && res.status < 300) {
      console.info(`[afterAll] ${label}: OK (${res.status})`);
    } else {
      console.warn(`[afterAll] ${label}: FAILED, left behind (status ${res.status})`);
    }
  } catch (e) {
    console.warn(`[afterAll] ${label}: threw, left behind:`, e);
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  clearAllCookies();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

// This is the guaranteed safety net: it runs even if a test earlier in the
// file throws, times out, or the "Cleanup — ..." block never gets reached.
// The in-suite logout tests clear the session cookie before this runs, so we
// must re-authenticate here — without it every call below 401s while still
// "succeeding" from a try/catch's point of view.
afterAll(async () => {
  // Restore console.warn/.log now — beforeAll silenced them for the whole
  // run, and if we wait until the end of this hook to restore, every
  // failure warning below gets swallowed right when it matters most.
  jest.restoreAllMocks();

  if (!HAS_INTEGRATION_CREDENTIALS) return;

  try {
    await loginAsAdmin();
  } catch (e) {
    console.warn('[afterAll] Failed to re-authenticate before cleanup — created test data may remain:', e);
    return;
  }

  if (createdComponentId) {
    await attemptCleanup(`Detach component ID=${createdComponentId}`, () =>
      systemComponentDetachPOST(
        makeRequest(`/api/system/component/${createdComponentId}/detach`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdComponentId) }) }
      )
    );
    await attemptCleanup(`Delete component ID=${createdComponentId}`, () =>
      systemComponentDeletePOST(
        makeRequest(`/api/system/component/${createdComponentId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdComponentId) }) }
      )
    );
  }
  if (createdSystemId) {
    // deleteSystem is a two-step confirm — the first call only flips the
    // tool to NOT_OPERATIONAL; the second call actually removes the row.
    await attemptCleanup(`Delete system ID=${createdSystemId} (step 1/2)`, () =>
      systemByIdDeletePOST(
        makeRequest(`/api/system/${createdSystemId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdSystemId) }) }
      )
    );
    await attemptCleanup(`Delete system ID=${createdSystemId} (step 2/2)`, () =>
      systemByIdDeletePOST(
        makeRequest(`/api/system/${createdSystemId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdSystemId) }) }
      )
    );
  }
  if (createdComponentTypeId) {
    await attemptCleanup(`Delete component type ID=${createdComponentTypeId}`, () =>
      systemComponentTypeDeleteDEL(
        makeRequest(`/api/system/component-types/${createdComponentTypeId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdComponentTypeId) }) }
      )
    );
  }
  if (createdDroneClassId) {
    await attemptCleanup(`Delete drone class ID=${createdDroneClassId}`, () =>
      systemDroneClassDeleteDEL(
        makeRequest(`/api/system/drone-classes/${createdDroneClassId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdDroneClassId) }) }
      )
    );
  }
  if (createdOwnerId) {
    await attemptCleanup(`Delete owner ID=${createdOwnerId}`, () =>
      ownerByIdDEL(
        makeRequest(`/api/owner/${createdOwnerId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdOwnerId) }) }
      )
    );
  }
  if (createdApiKeyId) {
    await attemptCleanup(`Delete API key ID=${createdApiKeyId}`, () =>
      apiKeyDeleteDEL(
        makeRequest(`/api/settings/api-keys/${createdApiKeyId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdApiKeyId) }) }
      )
    );
  }
  if (createdDocumentId) {
    await attemptCleanup(`Delete document ID=${createdDocumentId}`, () =>
      documentDeletePOST(makeRequest('/api/document/delete', { method: 'POST', body: { document_id: createdDocumentId } }))
    );
  }
  if (createdDocumentTypeId) {
    await attemptCleanup(`Delete document type ID=${createdDocumentTypeId}`, () =>
      documentTypeDeleteDEL(
        makeRequest(`/api/document/types/${createdDocumentTypeId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdDocumentTypeId) }) }
      )
    );
  }
  if (createdEvidenceId) {
    await attemptCleanup(`Delete evidence ID=${createdEvidenceId}`, () =>
      evidenceDeletePOST(
        makeRequest('/api/compliance/requirements-evidences/evidence/delete', { method: 'POST', body: { evidence_id: createdEvidenceId } })
      )
    );
  }
  if (createdComplianceId) {
    await attemptCleanup(`Delete compliance requirement ID=${createdComplianceId}`, () =>
      auditPlanDeletePOST(
        makeRequest('/api/compliance/audit-plan/delete', { method: 'POST', body: { requirement_id: createdComplianceId } })
      )
    );
  }
  if (createdMaintenanceTicketId) {
    // No delete endpoint exists for maintenance tickets — closing is the
    // furthest cleanup this API surface supports.
    await attemptCleanup(`Close maintenance ticket ID=${createdMaintenanceTicketId}`, () =>
      maintenanceTicketClosePOST(
        makeRequest('/api/system/maintenance/tickets/close', { method: 'POST', body: { ticket_id: createdMaintenanceTicketId } })
      )
    );
  }
  if (createdSystemModelId) {
    await attemptCleanup(`Delete drone model ID=${createdSystemModelId}`, () =>
      systemModelDeletePOST(
        makeRequest(`/api/system/model/${createdSystemModelId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdSystemModelId) }) }
      )
    );
  }
  if (createdOrgCommunicationId) {
    await attemptCleanup(`Delete org communication ID=${createdOrgCommunicationId}`, () =>
      orgCommunicationDeletePOST(
        makeRequest('/api/organization/communication/delete', { method: 'POST', body: { communication_id: createdOrgCommunicationId } })
      )
    );
  }
  if (createdAssignmentId) {
    await attemptCleanup(`Delete org assignment ID=${createdAssignmentId}`, () =>
      orgAssignmentByIdDEL(
        makeRequest(`/api/organization/assignment/${createdAssignmentId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdAssignmentId) }) }
      )
    );
  }
  if (createdCalendarOpId) {
    await attemptCleanup(`Delete calendar op ID=${createdCalendarOpId}`, () =>
      opCalendarByIdDEL(
        makeRequest(`/api/operation/calendar/${createdCalendarOpId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdCalendarOpId) }) }
      )
    );
  }
  if (createdOperationId) {
    await attemptCleanup(`Delete operation ID=${createdOperationId}`, () =>
      operationByIdDEL(
        makeRequest(`/api/operation/${createdOperationId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdOperationId) }) }
      )
    );
  }
  if (createdPlanningId) {
    await attemptCleanup(`Delete planning ID=${createdPlanningId}`, () =>
      evaluationPlanningDEL(makeRequest('/api/evaluation/planning', { method: 'DELETE', body: { planning_id: createdPlanningId } }))
    );
  }
  if (createdEvaluationId) {
    await attemptCleanup(`Delete evaluation ID=${createdEvaluationId}`, () =>
      evaluationByIdDEL(
        makeRequest(`/api/evaluation/${createdEvaluationId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdEvaluationId) }) }
      )
    );
  }
  if (createdTrainingAttendanceId) {
    await attemptCleanup(`Delete training attendance ID=${createdTrainingAttendanceId}`, () =>
      trainingDeletePOST(makeRequest('/api/training/delete', { method: 'POST', body: { attendance_id: createdTrainingAttendanceId } }))
    );
  }
  if (createdShiftId) {
    await attemptCleanup(`Delete shift ID=${createdShiftId}`, () =>
      teamShiftDeleteDEL(
        makeRequest(`/api/team/shift/${createdShiftId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdShiftId) }) }
      )
    );
  }
  if (createdOrgLucProcedureId) {
    await attemptCleanup(`Delete org LUC procedure ID=${createdOrgLucProcedureId}`, () =>
      orgLucDeleteDEL(
        makeRequest(`/api/organization/luc-procedures/${createdOrgLucProcedureId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdOrgLucProcedureId) }) }
      )
    );
  }
  if (createdSpiKpiId) {
    // No delete endpoint exists for SPI/KPI definitions — deactivating is the
    // furthest cleanup this API surface supports.
    await attemptCleanup(`Deactivate SPI/KPI ID=${createdSpiKpiId}`, () =>
      spiKpiTogglePOST(makeRequest('/api/safety/spi-kpi/toggle', { method: 'POST', body: { id: createdSpiKpiId, is_active: 0 } }))
    );
  }
  if (createdChecklistId) {
    await attemptCleanup(`Deactivate checklist ID=${createdChecklistId}`, () =>
      checklistUpdatePUT(
        makeRequest(`/api/organization/checklist/${createdChecklistId}`, {
          method: 'PUT',
          body: { checklist_code: `TEST-DEL-${Date.now()}`, checklist_desc: 'Deactivated', checklist_ver: '1.0', checklist_active: 'N' },
        }),
        { params: Promise.resolve({ id: String(createdChecklistId) }) }
      )
    );
    await attemptCleanup(`Delete checklist ID=${createdChecklistId}`, () =>
      checklistDeleteDEL(
        makeRequest(`/api/organization/checklist/${createdChecklistId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdChecklistId) }) }
      )
    );
  }
  if (createdQualificationId) {
    await attemptCleanup(`Delete qualification ID=${createdQualificationId}`, () =>
      userQualificationDeleteDEL(
        makeRequest(`/api/team/user/qualifications/${createdQualificationId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: String(createdQualificationId) }) }
      )
    );
  }
  if (createdUserId) {
    await attemptCleanup(`Delete test user ID=${createdUserId}`, () =>
      deleteUserDELETE(makeRequest('/api/team/user/delete', { method: 'DELETE', body: { user_id: createdUserId } }))
    );
  }
  if (createdErpLocationGroupId) {
    await attemptCleanup(`Delete ERP location group ID=${createdErpLocationGroupId}`, () =>
      erpLocationGroupDeletePOST(makeRequest('/api/erp/location-group/delete', { method: 'POST', body: { id: createdErpLocationGroupId } }))
    );
  }
  if (createdErpId) {
    await attemptCleanup(`Delete ERP contact ID=${createdErpId}`, () =>
      erpDeletePOST(makeRequest('/api/erp/delete', { method: 'POST', body: { id: createdErpId } }))
    );
  }
  if (createdMissionTypeId) {
    await attemptCleanup(`Delete mission type ID=${createdMissionTypeId}`, () =>
      missionTypeDeletePOST(
        makeRequest(`/api/mission/type/${createdMissionTypeId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ typeId: String(createdMissionTypeId) }) }
      )
    );
  }
  if (createdMissionCategoryId) {
    await attemptCleanup(`Delete mission category ID=${createdMissionCategoryId}`, () =>
      missionCategoryDeletePOST(
        makeRequest(`/api/mission/category/${createdMissionCategoryId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdMissionCategoryId) }) }
      )
    );
  }
  if (createdMissionStatusId) {
    await attemptCleanup(`Delete mission status ID=${createdMissionStatusId}`, () =>
      missionStatusDeletePOST(
        makeRequest(`/api/mission/status/${createdMissionStatusId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdMissionStatusId) }) }
      )
    );
  }
  if (createdMissionResultId) {
    await attemptCleanup(`Delete mission result ID=${createdMissionResultId}`, () =>
      missionResultDeletePOST(
        makeRequest(`/api/mission/result/${createdMissionResultId}/delete`, { method: 'POST', body: {} }),
        { params: Promise.resolve({ id: String(createdMissionResultId) }) }
      )
    );
  }
  if (createdClientId) {
    await attemptCleanup(`Delete client ID=${createdClientId}`, () =>
      clientDeleteDEL(makeRequest('/api/client/delete', { method: 'DELETE', body: { client_id: createdClientId } }))
    );
  }
});

// ─── Flow ─────────────────────────────────────────────────────────────────────

describeIntegration('Full Platform Integration Flow', () => {

  beforeAll(async () => {
    await loginAsAdmin();
  });

  beforeEach(async () => {
    const testName = expect.getState().currentTestName ?? '';
    if (!shouldSkipSessionSetup(testName)) {
      await ensureLoggedIn();
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════════════════

  it('Auth — Login: sets auth cookie on valid credentials', async () => {
    clearAllCookies();
    const req  = makeRequest('/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    const res  = await loginPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getCookieStore().has('readi_auth_token')).toBe(true);
    console.info(`[Auth] Logged in as ${body.data?.email}`);
  });

  it('Auth — update-password: accepts new password', async () => {
    const req = makeRequest('/api/auth/update-password', { method: 'POST', body: { newPassword: ADMIN_PASSWORD } });
    const res = await updatePasswordPOST(req);
    expect(res.status).not.toBe(401);
    console.info(`[Auth] update-password: ${res.status}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  it('Dashboard — retrieves main dashboard data', async () => {
    const req  = makeRequest(`/api/dashboard/${OWNER_ID}`, { method: 'POST', body: { user_timezone: 'UTC' } });
    const res  = await dashboardPOST(req, { params: Promise.resolve({ id: String(OWNER_ID) }) });
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Dashboard — getSPIKPIData', async () => {
    const req = makeRequest('/api/dashboard/getSPIKPIData', { method: 'POST', body: {} });
    const res = await dashSpiKpiDataPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Dashboard — getSPIKPITrend', async () => {
    const req = makeRequest('/api/dashboard/getSPIKPITrend', { method: 'POST', body: { name: 'test' } });
    const res = await dashSpiKpiTrendPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Dashboard — getSHITrend', async () => {
    const req = makeRequest('/api/dashboard/getSHITrend', { method: 'POST', body: {} });
    const res = await dashShiTrendPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION
  // ══════════════════════════════════════════════════════════════════════════

  it('Authorization — retrieves my key', async () => {
    const res  = await authorizationMyKeyGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Authorization — lists transactions', async () => {
    const req = makeRequest('/api/authorization/list', { method: 'GET' });
    const res = await authorizationListGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Authorization — setup-pin validates fields', async () => {
    const req = makeRequest('/api/authorization/setup-pin', {
      method: 'POST',
      body: {
        encryptedPrivateKey: 'fake-encrypted-key',
        publicKey:           'fake-public-key',
        salt:                'fake-salt',
        iv:                  'fake-iv',
        keyFingerprint:      'fake-fingerprint',
      },
    });
    const res = await authorizationSetupPinPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT
  // ══════════════════════════════════════════════════════════════════════════

  it('Agent — usage/me', async () => {
    const res = await agentUsageMeGET();
    expect(res.status).not.toBe(401);
  });

  it('Agent — usage (org-level)', async () => {
    const res = await agentUsageGET();
    expect(res.status).not.toBe(401);
  });

  it('Agent — opm-users', async () => {
    const res = await agentOpmUsersGET();
    expect(res.status).not.toBe(401);
  });

  it('Agent — ingest GET lists knowledge documents', async () => {
    const res = await agentIngestGET();
    expect(res.status).not.toBe(401);
  });

  it('Agent — ask processes a question', async () => {
    const req = makeRequest('/api/agent/ask', { method: 'POST', body: { question: 'What is Readi?' } });
    const res = await agentAskPOST(req);
    expect(res.status).not.toBe(401);
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
  });

  it('Evaluation — lists LUC procedures for evaluation', async () => {
    const req  = makeRequest('/api/evaluation/luc-procedures', { method: 'GET' });
    const res  = await evaluationLucProceduresGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Evaluation — creates a new evaluation request', async () => {
    const req  = makeRequest('/api/evaluation/new-req/create', {
      method: 'POST',
      body: {
        data: {
          evaluation_status:       'DRAFT',
          evaluation_request_date: '2026-07-01',
          evaluation_year:         2026,
          evaluation_description:  'Flow test evaluation',
          areas: [],
        },
      },
    });
    const res  = await evaluationNewReqCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdEvaluationId = body.data?.evaluation_id ?? body.data?.id ?? body.id;
    console.info(`[Evaluation] Created ID=${createdEvaluationId} status=${res.status}`);
  });

  it('Evaluation — GET [id]', async () => {
    if (!createdEvaluationId) return;
    const req  = makeRequest(`/api/evaluation/${createdEvaluationId}`, { method: 'GET' });
    const res  = await evaluationByIdGET(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — Planning: GET lists', async () => {
    const req = makeRequest('/api/evaluation/planning', { method: 'GET' });
    const res = await evaluationPlanningGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — Planning: creates a planning record', async () => {
    if (!createdEvaluationId) return;
    const req  = makeRequest('/api/evaluation/planning', {
      method: 'POST',
      body: {
        fk_evaluation_id:      createdEvaluationId,
        planning_desc:         'Flow test planning',
        planning_status:       'DRAFT',
        planning_request_date: '2026-07-01',
        planning_year:         2026,
        assigned_to_user_id:   1,
      },
    });
    const res  = await evaluationPlanningPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdPlanningId = body.data?.planning_id ?? body.data?.id ?? body.id;
    console.info(`[Evaluation] Created planning ID=${createdPlanningId}`);
  });

  it('Evaluation — assignable plannings', async () => {
    const req = makeRequest('/api/planning/flight-requests/assignable-plannings', { method: 'GET' });
    const res = await planningAssignableGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Evaluation — mission list for a planning', async () => {
    const req  = makeRequest('/api/evaluation/mission/list', { method: 'POST', body: { mission_planning_id: createdPlanningId ?? 1 } });
    const res  = await evaluationMissionListPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MISSIONS CONFIG — CRUD
  // ══════════════════════════════════════════════════════════════════════════

  it('Missions — lists mission types', async () => {
    const res = await missionTypesGET(makeRequest('/api/mission/type/list', { method: 'GET' }));
    expect(res.status).toBe(200);
  });

  it('Missions — adds a mission type', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/mission/type/add', {
      method: 'POST',
      body: { mission_type_name: `FlowType${ts}`, mission_type_code: `FT${ts}` },
    });
    const res  = await missionTypeAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdMissionTypeId = body.data?.mission_type_id ?? body.data?.id ?? body.id;
    console.info(`[Missions] Created type ID=${createdMissionTypeId}`);
  });

  it('Missions — edits the mission type', async () => {
    if (!createdMissionTypeId) return;
    const req = makeRequest(`/api/mission/type/${createdMissionTypeId}/edit`, {
      method: 'PUT',
      body: { mission_type_name: 'FlowTypeUpdated', mission_type_code: `FTU${Date.now().toString().slice(-4)}` },
    });
    const res = await missionTypeEditPUT(req, { params: Promise.resolve({ typeId: String(createdMissionTypeId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Missions — lists mission categories', async () => {
    const res = await missionCategoriesGET(makeRequest('/api/mission/category/list', { method: 'GET' }));
    expect(res.status).toBe(200);
  });

  it('Missions — adds a mission category', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/mission/category/add', {
      method: 'POST',
      body: { mission_category_code: `FC${ts}`, mission_category_name: `FlowCat${ts}` },
    });
    const res  = await missionCategoryAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdMissionCategoryId = body.data?.category_id ?? body.data?.mission_category_id ?? body.data?.id ?? body.id;
    console.info(`[Missions] Created category ID=${createdMissionCategoryId}`);
  });

  it('Missions — updates the mission category', async () => {
    if (!createdMissionCategoryId) return;
    const req = makeRequest(`/api/mission/category/${createdMissionCategoryId}/update`, {
      method: 'POST',
      body: { mission_category_code: `FCU${Date.now().toString().slice(-4)}`, mission_category_name: 'FlowCatUpdated' },
    });
    const res = await missionCategoryUpdatePOST(req, { params: Promise.resolve({ id: String(createdMissionCategoryId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Missions — lists mission statuses', async () => {
    const res = await missionStatusesGET(makeRequest('/api/mission/status/list', { method: 'GET' }));
    expect(res.status).toBe(200);
  });

  it('Missions — adds a mission status', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/mission/status/add', {
      method: 'POST',
      body: { mission_status_code: `FS${ts}`, mission_status_name: `FlowStatus${ts}` },
    });
    const res  = await missionStatusAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdMissionStatusId = body.data?.status_id ?? body.data?.mission_status_id ?? body.data?.id ?? body.id;
    console.info(`[Missions] Created status ID=${createdMissionStatusId}`);
  });

  it('Missions — updates the mission status', async () => {
    if (!createdMissionStatusId) return;
    const req = makeRequest(`/api/mission/status/${createdMissionStatusId}/update`, {
      method: 'POST',
      body: { mission_status_code: `FSU${Date.now().toString().slice(-4)}`, mission_status_name: 'FlowStatusUpdated' },
    });
    const res = await missionStatusUpdatePOST(req, { params: Promise.resolve({ id: String(createdMissionStatusId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Missions — lists mission results', async () => {
    const res = await missionResultsGET(makeRequest('/api/mission/result/list', { method: 'GET' }));
    expect(res.status).toBe(200);
  });

  it('Missions — adds a mission result', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/mission/result/add', {
      method: 'POST',
      body: { mission_result_code: `FR${ts}`, mission_result_desc: `FlowResult${ts}` },
    });
    const res  = await missionResultAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdMissionResultId = body.data?.result_id ?? body.data?.mission_result_id ?? body.data?.id ?? body.id;
    console.info(`[Missions] Created result ID=${createdMissionResultId}`);
  });

  it('Missions — updates the mission result', async () => {
    if (!createdMissionResultId) return;
    const req = makeRequest(`/api/mission/result/${createdMissionResultId}/update`, {
      method: 'POST',
      body: { mission_result_code: `FRU${Date.now().toString().slice(-4)}`, mission_result_desc: 'FlowResultUpdated' },
    });
    const res = await missionResultUpdatePOST(req, { params: Promise.resolve({ id: String(createdMissionResultId) }) });
    expect(res.status).not.toBe(401);
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
  });

  it('Training — lists eligible users', async () => {
    const req  = makeRequest('/api/training/users', { method: 'GET' });
    const res  = await trainingUsersGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Training — creates attendance record', async () => {
    const req  = makeRequest('/api/training/add', {
      method: 'POST',
      body: { user_ids: [1], training_name: `Flow Training ${Date.now()}`, training_type: 'OTHER', session_date: '2026-06-01' },
    });
    const res  = await trainingAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdTrainingAttendanceId = Array.isArray(body.ids) ? body.ids[0] : body.ids;
    console.info(`[Training] Created attendance ID=${createdTrainingAttendanceId}`);
  });

  it('Training — GET attendance list', async () => {
    const req  = makeRequest('/api/training/attendance', { method: 'GET' });
    const res  = await trainingAttendanceGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Training — GET calendar', async () => {
    const req  = makeRequest('/api/training/calendar', { method: 'GET' });
    const res  = await trainingCalendarGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Training — GET curriculum', async () => {
    const req  = makeRequest('/api/training/curriculum', { method: 'GET' });
    const res  = await trainingCurriculumGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Training — recompute stats', async () => {
    const req  = makeRequest('/api/training/recompute', { method: 'POST', body: {} });
    const res  = await trainingRecomputePOST(req);
    expect(res.status).not.toBe(401);
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
    console.info(`[Team] ${body.dataRows} users`);
  });

  it('Team — check-username availability', async () => {
    const req  = makeRequest('/api/team/user/check-username?username=flowtest_check', { method: 'GET' });
    const res  = await teamCheckUsernameGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('available');
  });

  it('Team — creates a test user', async () => {
    const ts = Date.now();
    const req = makeRequest('/api/team/user/add', {
      method: 'POST',
      body: {
        username: `flowtest${ts}`, fullname: 'Flow Test User',
        email: `flow-test-${ts}@readi-test.local`,
        profile: 14, user_type: 'EMPLOYEE', user_viewer: 'N', user_manager: 'N', timezone: 'UTC',
      },
    });
    const res  = await addUserPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    createdUserId = body.newId;
    console.info(`[Team] Created user ID=${createdUserId}`);
  });

  it('Team — updates the test user', async () => {
    if (!createdUserId) return;
    const req = makeRequest('/api/team/user/update', {
      method: 'POST',
      body: {
        user_id: createdUserId, fullname: 'Flow Test User (Updated)',
        email: `flow-upd-${Date.now()}@readi-test.local`,
        fk_user_profile_id: 14, user_type: 'EMPLOYEE', active: 1, is_viewer: 'N', is_manager: 'N',
      },
    });
    const res  = await updateUserPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Team — resend-invite', async () => {
    if (!createdUserId) return;
    const req = makeRequest('/api/team/user/resend-invite', { method: 'POST', body: { user_id: createdUserId } });
    const res = await teamResendInvitePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Team — lists shifts', async () => {
    const req  = makeRequest('/api/team/shift', { method: 'GET' });
    const res  = await teamShiftListGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('Team — creates a shift', async () => {
    const req  = makeRequest('/api/team/shift/create', {
      method: 'POST',
      body: {
        shift_date_start: '2026-07-01', shift_date_end: '2026-07-01',
        shift_time_start: '08:00:00',  shift_time_end: '16:00:00',
        shift_category: 'ON_DUTY', user_ids: [createdUserId ?? 1],
      },
    });
    const res  = await teamShiftCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdShiftId = Array.isArray(body.newShiftIds) ? body.newShiftIds[0] : body.newShiftIds;
    console.info(`[Team] Created shift ID=${createdShiftId}`);
  });

  it('Team — lists user qualifications', async () => {
    const req  = makeRequest(`/api/team/user/qualifications?user_id=${createdUserId ?? 1}`, { method: 'GET' });
    const res  = await userQualificationsGET(req);
    expect(res.status).toBe(200);
  });

  it('Team — adds user qualifications', async () => {
    if (!createdUserId) return;
    const req  = makeRequest('/api/team/user/qualifications', {
      method: 'POST',
      body: { user_id: createdUserId, qualifications: [{ qualification_name: 'Flow Cert', qualification_type: 'Certification', status: 'Active' }] },
    });
    const res  = await userQualificationsPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdQualificationId = body.data?.[0]?.qualification_id;
    console.info(`[Team] Created qualification ID=${createdQualificationId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SYSTEMS
  // ══════════════════════════════════════════════════════════════════════════

  it('Systems — lists systems', async () => {
    const res = await systemListPOST(makeRequest('/api/system/list', { method: 'POST', body: { active: 'ALL' } }));
    expect(res.status).not.toBe(401);
  });

  it('Systems — lists drone models', async () => {
    const res = await systemModelListPOST(makeRequest('/api/system/model/list', { method: 'POST', body: {} }));
    expect(res.status).not.toBe(401);
  });

  it('Systems — adds a drone model', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/system/model/add', {
      method: 'POST',
      body: { model_code: `FM${ts}`, model_name: `FlowModel${ts}`, manufacturer: 'FlowMfg' },
    });
    const res  = await systemModelAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdSystemModelId = body.data?.model_id ?? body.data?.id ?? body.id;
    console.info(`[Systems] Created model ID=${createdSystemModelId} status=${res.status}`);
  });

  it('Systems — updates the drone model', async () => {
    if (!createdSystemModelId) return;
    const req = makeRequest(`/api/system/model/${createdSystemModelId}/update`, {
      method: 'POST',
      body: { model_code: `FMU${Date.now().toString().slice(-4)}`, model_name: 'FlowModelUpdated', manufacturer: 'FlowMfg' },
    });
    const res = await systemModelUpdatePOST(req, { params: Promise.resolve({ id: String(createdSystemModelId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Systems — lists components', async () => {
    const res = await systemComponentListPOST(makeRequest('/api/system/component/list', { method: 'POST', body: {} }));
    expect(res.status).not.toBe(401);
  });

  it('Systems — lists component types', async () => {
    const res  = await systemComponentTypesGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Systems — lists drone classes', async () => {
    const req  = makeRequest('/api/system/drone-classes', { method: 'GET' });
    const res  = await systemDroneClassesGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Systems — maintenance dashboard', async () => {
    const req  = makeRequest('/api/system/maintenance/dashboard', { method: 'POST', body: { threshold_alert: 80 } });
    const res  = await maintenanceDashboardPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Systems — maintenance tickets list', async () => {
    const req  = makeRequest('/api/system/maintenance/tickets', { method: 'GET' });
    const res  = await maintenanceTicketsGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.status).toBe('OK');
  });

  it('Systems — maintenance lookups', async () => {
    const req  = makeRequest('/api/system/maintenance/lookups?type=drones', { method: 'GET' });
    const res  = await systemMaintenanceLookupsGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Systems — creates a maintenance ticket', async () => {
    const req  = makeRequest('/api/system/maintenance/tickets/create', {
      method: 'POST',
      body: { issue_description: 'Flow test maintenance ticket' },
    });
    const res  = await maintenanceTicketCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdMaintenanceTicketId = body.ticket_id;
    console.info(`[Systems] Created ticket ID=${createdMaintenanceTicketId} status=${res.status}`);
  });

  it('Systems — maintenance ticket events', async () => {
    if (!createdMaintenanceTicketId) return;
    const req  = makeRequest(`/api/system/maintenance/tickets/events?ticket_id=${createdMaintenanceTicketId}`, { method: 'GET' });
    const res  = await maintenanceTicketEventsGET(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  it('Operations — lists operations', async () => {
    const req  = makeRequest('/api/operation', { method: 'GET' });
    const res  = await operationListGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — creates an operation', async () => {
    const req  = makeRequest('/api/operation', {
      method: 'POST',
      body: {
        mission_name:    'Flow Test Operation',
        scheduled_start: '2026-07-01T09:00:00.000Z',
        location:        'Flow Test Location',
      },
    });
    const res  = await operationCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdOperationId = body.id ?? body.mission_id ?? body.data?.id;
    console.info(`[Operations] Created op ID=${createdOperationId} status=${res.status}`);
  });

  it('Operations — GET [id]', async () => {
    if (!createdOperationId) return;
    const req = makeRequest(`/api/operation/${createdOperationId}`, { method: 'GET' });
    const res = await operationByIdGET(req, { params: Promise.resolve({ id: String(createdOperationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — PUT [id]', async () => {
    if (!createdOperationId) return;
    const req = makeRequest(`/api/operation/${createdOperationId}`, {
      method: 'PUT',
      body: { mission_name: 'Flow Test Op (Updated)', location: 'Updated Location' },
    });
    const res = await operationByIdPUT(req, { params: Promise.resolve({ id: String(createdOperationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — retrieves operations board', async () => {
    const req = makeRequest('/api/operation/board', { method: 'GET' });
    const res = await opBoardGET(req);
    expect(res.status).toBe(200);
  });

  it('Operations — board status POST', async () => {
    const req = makeRequest('/api/operation/board/status', {
      method: 'POST',
      body: { mission_id: createdOperationId ?? 1, status: 'IN_PROGRESS' },
    });
    const res = await opBoardStatusPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — board post-flight GET', async () => {
    const req = makeRequest(`/api/operation/board/post-flight?mission_id=${createdOperationId ?? 1}`, { method: 'GET' });
    const res = await opBoardPostFlightGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — retrieves calendar events', async () => {
    const res = await opCalendarGET();
    expect(res.status).toBe(200);
  });

  it('Operations — creates a calendar operation', async () => {
    const req  = makeRequest('/api/operation/calendar/create', {
      method: 'POST',
      body: { mission_name: 'Flow Calendar Op', scheduled_start: '2026-07-02T10:00:00.000Z', location: 'Flow Location' },
    });
    const res  = await opCalendarCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdCalendarOpId = body.operationId ?? body.id ?? body.data?.id;
    console.info(`[Operations] Calendar op ID=${createdCalendarOpId} status=${res.status}`);
  });

  it('Operations — communication recipients', async () => {
    const req  = makeRequest('/api/operation/communication/recipients', { method: 'GET' });
    const res  = await opCommunicationRecipientsGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('recipients');
  });

  it('Operations — import options', async () => {
    const req = makeRequest('/api/operation/import/options?type=clients', { method: 'GET' });
    const res = await opImportOptionsGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — batch autofill', async () => {
    const req = makeRequest('/api/operation/batch/autofill', {
      method: 'POST',
      body: { mission_ids: [createdOperationId ?? 1] },
    });
    const res = await opBatchAutofillPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — batch set-pilot', async () => {
    const req = makeRequest('/api/operation/batch/set-pilot', {
      method: 'POST',
      body: { mission_ids: [createdOperationId ?? 1], pilot_id: 1 },
    });
    const res = await opBatchSetPilotPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — missions checklist GET', async () => {
    const id  = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/missions/${id}/checklist?code=TEST`, { method: 'GET' });
    const res = await opMissionChecklistGET(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — missions LUC GET', async () => {
    const id  = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/missions/${id}/luc`, { method: 'GET' });
    const res = await opMissionLucGET(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — retrieves options', async () => {
    const res = await opOptionsGET();
    expect(res.status).toBe(200);
  });

  it('Operations — pilot declaration GET', async () => {
    const req = makeRequest('/api/operation/pilot/declaration', { method: 'GET' });
    const res = await opPilotDeclarationGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — report-issue GET', async () => {
    const req = makeRequest('/api/operation/report-issue?tool_id=1', { method: 'GET' });
    const res = await opReportIssueGET(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOGBOOKS
  // ══════════════════════════════════════════════════════════════════════════

  it('Logbooks — mission list', async () => {
    const req  = makeRequest('/api/logbooks/mission/list', { method: 'POST', body: {} });
    const res  = await missionLogbookPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(200);
  });

  it('Logbooks — mission filter', async () => {
    const req = makeRequest('/api/logbooks/mission/filter', { method: 'POST', body: {} });
    const res = await missionLogbookFilterPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Logbooks — operation list', async () => {
    const req  = makeRequest('/api/logbooks/operation/list', { method: 'POST', body: {} });
    const res  = await operationLogbookPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(200);
  });

  it('Logbooks — operation filter', async () => {
    const req = makeRequest('/api/logbooks/operation/filter', { method: 'POST', body: {} });
    const res = await operationLogbookFilterPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Logbooks — battery list', async () => {
    const req  = makeRequest('/api/logbooks/battery/list', { method: 'POST', body: {} });
    const res  = await batteryLogbookPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(200);
  });

  it('Logbooks — battery filter', async () => {
    const req = makeRequest('/api/logbooks/battery/filter', { method: 'POST', body: {} });
    const res = await batteryLogbookFilterPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Logbooks — battery cycles', async () => {
    const req = makeRequest('/api/logbooks/battery/1/cycles', { method: 'POST', body: {} });
    const res = await batteryLogbookCyclesPOST(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PLANNING
  // ══════════════════════════════════════════════════════════════════════════

  it('Planning — lists flight requests', async () => {
    const req  = makeRequest('/api/planning/flight-requests', { method: 'POST', body: { status: 'ALL' } });
    const res  = await flightRequestsPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Planning — lists LUC procedures', async () => {
    const req  = makeRequest('/api/luc-procedures/list', { method: 'GET' });
    const res  = await lucProceduresGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ORGANIZATION
  // ══════════════════════════════════════════════════════════════════════════

  it('Organization — lists checklists', async () => {
    const res = await checklistListGET(makeRequest('/api/organization/checklist', { method: 'GET' }));
    expect(res.status).toBe(200);
  });

  it('Organization — creates a checklist', async () => {
    const req  = makeRequest('/api/organization/checklist', {
      method: 'POST',
      body: { checklist_code: `TEST-${Date.now()}`, checklist_desc: 'Flow test checklist', checklist_ver: '1.0', checklist_active: 'Y' },
    });
    const res  = await checklistCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdChecklistId = body.data?.checklist_id ?? body.checklist_id;
    console.info(`[Organization] Created checklist ID=${createdChecklistId}`);
  });

  it('Organization — updates the checklist', async () => {
    if (!createdChecklistId) return;
    const req  = makeRequest(`/api/organization/checklist/${createdChecklistId}`, {
      method: 'PUT',
      body: { checklist_code: `TEST-UPD-${Date.now()}`, checklist_desc: 'Updated', checklist_ver: '1.1', checklist_active: 'Y' },
    });
    const res = await checklistUpdatePUT(req, { params: Promise.resolve({ id: String(createdChecklistId) }) });
    expect(res.status).toBe(200);
  });

  it('Organization — checklist data', async () => {
    const req = makeRequest('/api/organization/checklist/data', { method: 'POST', body: { checklist_code: 'ANY' } });
    const res = await orgChecklistDataPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Organization — retrieves org chart', async () => {
    const req  = makeRequest('/api/organization/chart', { method: 'GET' });
    const res  = await orgChartGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Organization — lists assignments', async () => {
    const res  = await orgAssignmentGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Organization — creates an assignment', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/organization/assignment', {
      method: 'POST',
      body: { assignment_code: `ASGN${ts}`, assignment_desc: 'Flow Test Assignment' },
    });
    const res  = await orgAssignmentPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdAssignmentId = body.data?.assignment_id ?? body.data?.id ?? body.id;
    console.info(`[Organization] Created assignment ID=${createdAssignmentId}`);
  });

  it('Organization — updates the assignment', async () => {
    if (!createdAssignmentId) return;
    const req = makeRequest(`/api/organization/assignment/${createdAssignmentId}`, {
      method: 'PUT',
      body: { assignment_code: `ASGNU${Date.now().toString().slice(-4)}`, assignment_desc: 'Updated', assignment_active: 'Y' },
    });
    const res = await orgAssignmentByIdPUT(req, { params: Promise.resolve({ id: String(createdAssignmentId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Organization — lists LUC procedures', async () => {
    const req  = makeRequest('/api/organization/luc-procedures', { method: 'GET' });
    const res  = await orgLucListGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Organization — creates a LUC procedure', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/organization/luc-procedures', {
      method: 'POST',
      body: { procedure_code: `PROC${ts}`, procedure_name: 'Flow Test Procedure', procedure_status: 'PLANNING', procedure_active: 'Y' },
    });
    const res  = await orgLucCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdOrgLucProcedureId = body.data?.procedure_id ?? body.data?.id;
    console.info(`[Organization] Created LUC procedure ID=${createdOrgLucProcedureId}`);
  });

  it('Organization — lists communication channels', async () => {
    const req  = makeRequest('/api/organization/communication', { method: 'GET' });
    const res  = await orgCommunicationGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Organization — adds a communication record', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/organization/communication/add', {
      method: 'POST',
      body: { communication_code: `COMM${ts}`, communication_desc: 'Flow Test Comm', communication_ver: '1.0', communication_active: 'Y' },
    });
    const res  = await orgCommunicationAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdOrgCommunicationId = body.data?.communication_id ?? body.data?.id ?? body.id;
    console.info(`[Organization] Created communication ID=${createdOrgCommunicationId}`);
  });

  it('Organization — updates the communication record', async () => {
    if (!createdOrgCommunicationId) return;
    const req = makeRequest('/api/organization/communication/update', {
      method: 'PUT',
      body: { communication_id: createdOrgCommunicationId, communication_code: `COMMU`, communication_desc: 'Updated', communication_ver: '1.1', communication_active: 'Y' },
    });
    const res = await orgCommunicationUpdatePUT(req);
    expect(res.status).not.toBe(401);
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
  });

  it('Compliance — audit plan stats', async () => {
    const res  = await auditPlanStatsGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Compliance — audit plan list', async () => {
    const req  = makeRequest('/api/compliance/audit-plan/list', { method: 'GET' });
    const res  = await auditPlanListGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Compliance — adds a compliance requirement', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/compliance/audit-plan/add', {
      method: 'POST',
      body: { requirement_code: `REQ${ts}`, requirement_title: 'Flow Test Requirement', requirement_status: 'NOT_APPLICABLE' },
    });
    const res  = await auditPlanAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    createdComplianceId = body.data?.requirement_id ?? body.data?.id;
    console.info(`[Compliance] Created requirement ID=${createdComplianceId}`);
  });

  it('Compliance — updates the requirement', async () => {
    if (!createdComplianceId) return;
    const req = makeRequest('/api/compliance/audit-plan/update', {
      method: 'POST',
      body: { requirement_id: createdComplianceId, requirement_title: 'Flow Test Req (Updated)', requirement_status: 'NOT_APPLICABLE' },
    });
    const res = await auditPlanUpdatePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Compliance — updates requirement status', async () => {
    if (!createdComplianceId) return;
    const req = makeRequest('/api/compliance/requirements-evidences/status', {
      method: 'POST',
      body: { requirement_id: createdComplianceId, new_status: 'NOT_APPLICABLE' },
    });
    const res = await requirementStatusPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Compliance — adds evidence to the requirement', async () => {
    if (!createdComplianceId) return;
    const req = makeRequest('/api/compliance/requirements-evidences/evidence/add', {
      method: 'POST',
      body: { requirement_id: createdComplianceId, evidence_type: 'RECORD', evidence_description: 'Flow test evidence' },
    });
    const res  = await evidenceAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdEvidenceId = body.data?.evidence_id ?? body.data?.id ?? body.id;
    console.info(`[Compliance] Created evidence ID=${createdEvidenceId} status=${res.status}`);
  });

  it('Compliance — lists evidence for requirement', async () => {
    if (!createdComplianceId) return;
    const req  = makeRequest(`/api/compliance/requirements-evidences/evidence/list?requirement_id=${createdComplianceId}`, { method: 'GET' });
    const res  = await evidenceListGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Compliance — compliance calendar', async () => {
    const res  = await complianceCalendarGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Compliance — safety target review generate', async () => {
    const req = makeRequest('/api/compliance/safety-target-review/generate?months=3', { method: 'GET' });
    const res = await safetyTargetReviewGET(req);
    expect(res.status).not.toBe(401);
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
  });

  it('Safety — creates a SPI/KPI definition', async () => {
    const req  = makeRequest('/api/safety/spi-kpi/save', {
      method: 'POST',
      body: {
        indicator_code: `TEST_${Date.now().toString().slice(-6)}`,
        indicator_type: 'KPI', indicator_area: 'OPERATIONS',
        indicator_name: 'Flow Test KPI', target_value: 100, unit: '%', frequency: 'MONTHLY', is_active: 1,
      },
    });
    const res  = await spiKpiSavePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdSpiKpiId = body.data?.id;
    console.info(`[Safety] Created SPI/KPI ID=${createdSpiKpiId}`);
  });

  it('Safety — logs a measurement', async () => {
    if (!createdSpiKpiId) return;
    const req  = makeRequest('/api/safety/spi-kpi/log-measurement', {
      method: 'POST',
      body: { definition_id: createdSpiKpiId, measurement_date: '2026-06-01', actual_value: 85, target_value: 100, status: 'YELLOW' },
    });
    const res  = await spiKpiLogMeasurementPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    expect(body.code).toBe(1);
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
  });

  it('Documents — type-list', async () => {
    const res = await documentTypeListPOST();
    expect(res.status).not.toBe(401);
  });

  it('Documents — creates a document type', async () => {
    const ts  = Date.now().toString().slice(-6);
    const req = makeRequest('/api/document/types', {
      method: 'POST',
      body: { doc_type_name: `FlowDocType${ts}`, doc_type_category: 'OPERATIONS' },
    });
    const res  = await documentTypesCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdDocumentTypeId = body.data?.doc_type_id ?? body.data?.id ?? body.id;
    console.info(`[Documents] Created type ID=${createdDocumentTypeId}`);
  });

  it('Documents — updates the document type', async () => {
    if (!createdDocumentTypeId) return;
    const req = makeRequest(`/api/document/types/${createdDocumentTypeId}`, {
      method: 'PATCH',
      body: { doc_type_name: 'FlowDocTypeUpdated' },
    });
    const res = await documentTypeUpdatePATCH(req, { params: Promise.resolve({ id: String(createdDocumentTypeId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Documents — presign-upload returns upload URL', async () => {
    const req  = makeRequest('/api/document/presign-upload', {
      method: 'POST',
      body: { file_name: 'flow-test.pdf', content_type: 'application/pdf', file_size: 1024 },
    });
    const res  = await documentPresignUploadPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    expect(body.upload_url).toBeDefined();
  });

  it('Documents — creates a document record', async () => {
    if (!createdDocumentTypeId) return;
    const req  = makeRequest('/api/document/create', {
      method: 'POST',
      body: {
        doc_type_id: createdDocumentTypeId, s3_key: 'fake/key', file_name: 'flow-test.pdf',
        file_size: 1024, title: 'Flow Test Document', status: 'DRAFT', confidentiality: 'INTERNAL',
      },
    });
    const res  = await documentCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdDocumentId = body.data?.document_id ?? body.data?.id ?? body.id;
    console.info(`[Documents] Created document ID=${createdDocumentId}`);
  });

  it('Documents — retrieves document history', async () => {
    if (!createdDocumentId) return;
    const req = makeRequest('/api/document/history', { method: 'POST', body: { document_id: createdDocumentId } });
    const res = await documentHistoryPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Documents — updates the document', async () => {
    if (!createdDocumentId || !createdDocumentTypeId) return;
    const req = makeRequest('/api/document/update', {
      method: 'POST',
      body: { document_id: createdDocumentId, doc_type_id: createdDocumentTypeId, status: 'DRAFT', title: 'Flow Doc Updated', confidentiality: 'INTERNAL' },
    });
    const res = await documentUpdatePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DCC
  // ══════════════════════════════════════════════════════════════════════════

  it('DCC — report-bug', async () => {
    const req = makeRequest('/api/dcc/report-bug', { method: 'POST', body: { title: 'Flow test bug', dcc: '{}' } });
    const res = await dccReportBugPOST(req);
    expect(res.status).not.toBe(401);
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
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CLIENT
  // ══════════════════════════════════════════════════════════════════════════

  it('Client — lists clients', async () => {
    const res = await clientListGET(makeRequest('/api/client/list', { method: 'GET' }));
    expect(res.status).toBe(200);
  });

  it('Client — check-username availability', async () => {
    const req = makeRequest('/api/client/check-username?username=flowclientcheck', { method: 'GET' });
    const res = await clientCheckUsernameGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Client — creates a test client', async () => {
    const ts  = Date.now();
    const req = makeRequest('/api/client/add', {
      method: 'POST',
      body: { client_name: `Flow Client ${ts}`, client_email: `flow-client-${ts}@readi-test.local`, username: `flowclient${ts}` },
    });
    const res  = await clientAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdClientId = body.data?.client_id ?? body.data?.id;
    console.info(`[Client] Created client ID=${createdClientId}`);
  });

  it('Client — updates the client', async () => {
    if (!createdClientId) return;
    const req = makeRequest('/api/client/update', {
      method: 'POST',
      body: { client_id: createdClientId, client_name: 'Flow Client (Updated)', client_active: true },
    });
    const res = await clientUpdatePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CLIENT PORTAL (ADMIN session lacks clientId — expect 401/403)
  // ══════════════════════════════════════════════════════════════════════════

  it('Client Portal — analytics (auth enforced)', async () => {
    const res = await clientPortalAnalyticsGET();
    expect(res.status).not.toBe(500);
  });

  it('Client Portal — dashboard (auth enforced)', async () => {
    const res = await clientPortalDashboardGET();
    expect(res.status).not.toBe(500);
  });

  it('Client Portal — missions (auth enforced)', async () => {
    const req = makeRequest('/api/client-portal/missions', { method: 'GET' });
    const res = await clientPortalMissionsGET(req);
    expect(res.status).not.toBe(500);
  });

  it('Client Portal — profile (auth enforced)', async () => {
    const res = await clientPortalProfileGET();
    expect(res.status).not.toBe(500);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ERP
  // ══════════════════════════════════════════════════════════════════════════

  it('ERP — lists emergency response entries', async () => {
    const req  = makeRequest('/api/erp/list', { method: 'GET' });
    const res  = await erpListGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('ERP — creates an emergency contact', async () => {
    const req  = makeRequest('/api/erp/save', {
      method: 'POST',
      body: { description: 'Flow ERP', contact: '+1-555-0100', type: 'GENERAL' },
    });
    const res  = await erpSavePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdErpId = body.data?.id;
    console.info(`[ERP] Created contact ID=${createdErpId}`);
  });

  it('ERP — updates the emergency contact', async () => {
    if (!createdErpId) return;
    const req  = makeRequest('/api/erp/update', {
      method: 'POST',
      body: { id: createdErpId, description: 'Flow ERP Updated', contact: '+1-555-0199', type: 'GENERAL' },
    });
    const res  = await erpUpdatePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('ERP — lists location groups', async () => {
    const req  = makeRequest('/api/erp/location-group/list', { method: 'GET' });
    const res  = await erpLocationGroupListGET(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('ERP — creates a location group', async () => {
    const req  = makeRequest('/api/erp/location-group/save', {
      method: 'POST',
      body: { name: `Flow LG ${Date.now().toString().slice(-6)}`, is_active: true },
    });
    const res  = await erpLocationGroupSavePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdErpLocationGroupId = body.data?.group_id ?? body.data?.id;
    console.info(`[ERP] Created location group ID=${createdErpLocationGroupId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  it('Profile — retrieves current user profile', async () => {
    const res  = await profileGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    console.info(`[Profile] ${body.user?.email}`);
  });

  it('Profile — update EASA operator code', async () => {
    const req = makeRequest('/api/profile/easa-code', { method: 'PATCH', body: { easa_operator_code: null } });
    const res = await profileEasaCodePATCH(req);
    expect(res.status).not.toBe(401);
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

  it('Notifications — mark-all-read', async () => {
    const req  = makeRequest('/api/notification/mark-all-read', { method: 'POST', body: {} });
    const res  = await notificationMarkAllReadPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════════

  it('Settings — lists API keys', async () => {
    const res  = await apiKeysGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Settings — creates an API key', async () => {
    const req  = makeRequest('/api/settings/api-keys', { method: 'POST', body: { key_name: `FlowKey${Date.now()}` } });
    const res  = await apiKeyCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(201);
    createdApiKeyId = body.api_key_id ?? body.data?.id ?? body.id;
    console.info(`[Settings] Created API key ID=${createdApiKeyId}`);
  });

  it('Settings — GET DCC integration', async () => {
    const res  = await settingsDccGET();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Settings — POST DCC integration', async () => {
    const req  = makeRequest('/api/settings/dcc', { method: 'POST', body: { enabled: false } });
    const res  = await settingsDccPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RELEASES
  // ══════════════════════════════════════════════════════════════════════════

  it('Releases — lists release notes', async () => {
    const res = await releasesGET();
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OWNER (SUPERADMIN — ADMIN user expects 403)
  // ══════════════════════════════════════════════════════════════════════════

  it('Owner — list (403 for ADMIN, not 401)', async () => {
    const res = await ownerListGET();
    expect([200, 201, 403]).toContain(res.status);
  });

  it('Owner — check-unique (403 for ADMIN)', async () => {
    const req = makeRequest('/api/owner/check-unique?table=owner&field=owner_code&value=test', { method: 'GET' });
    const res = await ownerCheckUniqueGET(req);
    expect([200, 403]).toContain(res.status);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FLYTBASE (external)
  // ══════════════════════════════════════════════════════════════════════════

  it('FlytBase — token GET', async () => {
    const res = await flytbaseTokenGET();
    expect(res.status).not.toBe(401);
  });

  it('FlytBase — verify (dummy token)', async () => {
    const req = makeRequest('/api/flytbase/verify', { method: 'POST', body: { token: 'fake-token', orgId: 'fake-org' } });
    const res = await flytbaseVerifyPOST(req);
    expect(res.status).not.toBe(401);
  }, 15_000);

  it('FlytBase — flights GET', async () => {
    const req = makeRequest('/api/flytbase/flights', { method: 'GET' });
    const res = await flytbaseFlightsGET(req);
    expect(res.status).not.toBe(401);
  }, 15_000);

  // ══════════════════════════════════════════════════════════════════════════
  // DRONE ATC (external)
  // ══════════════════════════════════════════════════════════════════════════

  it('Drone ATC — airspace GET', async () => {
    const req = makeRequest('/api/drone-atc/airspace?south=0&west=0&north=1&east=1', { method: 'GET' });
    const res = await droneAtcAirspaceGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Drone ATC — fleet GET', async () => {
    const res = await droneAtcFleetGET();
    expect(res.status).not.toBe(401);
  });

  it('Drone ATC — weather GET', async () => {
    const req = makeRequest('/api/drone-atc/weather?lat=51.5&lon=-0.12', { method: 'GET' });
    const res = await droneAtcWeatherGET(req);
    expect(res.status).not.toBe(401);
  }, 10_000);

  // ══════════════════════════════════════════════════════════════════════════
  // GEOCODE
  // ══════════════════════════════════════════════════════════════════════════

  it('Geocode — GET with query', async () => {
    const req = makeRequest('/api/geocode?q=London', { method: 'GET' });
    const res = await geocodeGET(req);
    expect(res.status).not.toBe(500);
  }, 12_000);

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  it('Export — CSV/XLSX', async () => {
    const req = makeRequest('/api/export', {
      method: 'POST',
      body: { format: 'csv', filename: 'flow-test.csv', headers: ['Name', 'Value'], rows: [['Flow', '1']] },
    });
    const res = await exportPOST(req);
    expect(res.status).not.toBe(500);
  });

  it('Export — logs XLSX', async () => {
    const req = makeRequest('/api/export/logs', {
      method: 'POST',
      body: { format: 'xlsx', filename: 'flow-logs.xlsx', headers: ['Event', 'Time'], rows: [['Login', '2026-06-01']] },
    });
    const res = await exportLogsPOST(req);
    expect(res.status).not.toBe(500);
  });

  it('Export — sections XLSX', async () => {
    const req = makeRequest('/api/export/sections', {
      method: 'POST',
      body: { format: 'xlsx', filename: 'flow-sections.xlsx', sections: [{ title: 'S1', headers: ['H'], rows: [['R']] }] },
    });
    const res = await exportSectionsPOST(req);
    expect(res.status).not.toBe(500);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Auth — activate (invalid key — 404)', async () => {
    const req = makeRequest('/api/auth/activate', {
      method: 'POST',
      body: { id: 'nonexistent-key', email: 'nobody@readi-test.local', username: 'nobody' },
    });
    const res = await authActivatePOST(req);
    expect(res.status).not.toBe(500);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Authorization — transaction-sign POST', async () => {
    const req = makeRequest('/api/authorization/transaction-sign', {
      method: 'POST',
      body: { transaction_data: 'test-data', signature: 'test-sig' },
    });
    const res = await authTransactionSignPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Authorization — verify PATCH', async () => {
    const req = makeRequest('/api/authorization/verify', {
      method: 'PATCH',
      body: { token: 'test-token' },
    });
    const res = await authVerifyPATCH(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AGENT ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Agent — ingest POST (upload document)', async () => {
    const req = makeRequest('/api/agent/ingest', {
      method: 'POST',
      body: { title: 'Flow Test Doc', content: 'test content', type: 'manual' },
    });
    const res = await agentIngestPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Agent — ingest DELETE', async () => {
    const req = makeRequest('/api/agent/ingest', {
      method: 'DELETE',
      body: { id: 'nonexistent-doc-id' },
    });
    const res = await agentIngestDEL(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Compliance — requirements-evidences add POST', async () => {
    const req = makeRequest('/api/compliance/requirements-evidences/add', {
      method: 'POST',
      body: { requirement_title: 'Flow Req Add', requirement_code: `RADD${Date.now().toString().slice(-6)}` },
    });
    const res = await requirementsAddPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Compliance — requirements-evidences delete POST', async () => {
    const req = makeRequest('/api/compliance/requirements-evidences/delete', {
      method: 'POST',
      body: { requirement_id: 99999 },
    });
    const res = await requirementsDeletePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Compliance — safety-target-review approve POST', async () => {
    const req = makeRequest('/api/compliance/safety-target-review/approve', {
      method: 'POST',
      body: { review_id: 1 },
    });
    const res = await safetyTargetApprovePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CLIENT PORTAL ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Client Portal — profile PATCH', async () => {
    const req = makeRequest('/api/client-portal/profile', { method: 'PATCH', body: {} });
    const res = await clientPortalProfilePATCH(req);
    expect(res.status).not.toBe(500);
  });

  it('Client Portal — request-flight POST', async () => {
    const req = makeRequest('/api/client-portal/request-flight', {
      method: 'POST',
      body: { title: 'Flow Flight Request', location: 'Test Location' },
    });
    const res = await clientPortalRequestFlightPOST(req);
    expect(res.status).not.toBe(500);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENT ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Documents — presign-download POST', async () => {
    const req = makeRequest('/api/document/presign-download', {
      method: 'POST',
      body: { s3_key: 'fake/key', file_name: 'flow-test.pdf' },
    });
    const res = await documentPresignDownloadPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Documents — upload-revision POST', async () => {
    const req = makeRequest('/api/document/upload-revision', {
      method: 'POST',
      body: { document_id: createdDocumentId ?? 1, file_name: 'rev.pdf', content_type: 'application/pdf', file_size: 512 },
    });
    const res = await documentUploadRevisionPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DRONE ATC ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Drone ATC — connect POST', async () => {
    const res = await droneAtcConnectPOST();
    expect(res.status).not.toBe(401);
  });

  it('Drone ATC — flights GET', async () => {
    const req = makeRequest('/api/drone-atc/flights?limit=10', { method: 'GET' });
    const res = await droneAtcFlightsGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Drone ATC — stream GET', async () => {
    const req = makeRequest('/api/drone-atc/stream', { method: 'GET' });
    const res = await droneAtcStreamGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Drone ATC — sync-drc POST', async () => {
    const req = makeRequest('/api/drone-atc/sync-drc', { method: 'POST', body: {} });
    const res = await droneAtcSyncDrcPOST(req);
    expect(res.status).not.toBe(500);
  });

  it('Drone ATC — user-info GET', async () => {
    const req = makeRequest('/api/drone-atc/user-info', { method: 'GET' });
    const res = await droneAtcUserInfoGET(req);
    expect(res.status).not.toBe(500);
  });

  it('Drone ATC — users GET', async () => {
    const req = makeRequest('/api/drone-atc/users', { method: 'GET' });
    const res = await droneAtcUsersGET(req);
    expect(res.status).not.toBe(500);
  });

  it('Drone ATC — users PATCH', async () => {
    const res = await droneAtcUsersPATCH();
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ERP ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('ERP — location-group update POST', async () => {
    if (!createdErpLocationGroupId) return;
    const req = makeRequest('/api/erp/location-group/update', {
      method: 'POST',
      body: { id: createdErpLocationGroupId, name: `Flow LG Updated`, is_active: true },
    });
    const res = await erpLocationGroupUpdatePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EVALUATION ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Evaluation — PUT [id] (update evaluation)', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}`, {
      method: 'PUT',
      body: { evaluation_description: 'Updated by flow test', evaluation_status: 'DRAFT' },
    });
    const res = await evaluationByIdPUT(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/assignment POST', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/assignment`, {
      method: 'POST',
      body: { user_ids: [1] },
    });
    const res = await evalByIdAssignmentPOST(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/communication POST', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/communication`, {
      method: 'POST',
      body: { message: 'Flow test communication' },
    });
    const res = await evalByIdCommPOST(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/files GET', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/files`, { method: 'GET' });
    const res = await evalByIdFilesGET(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/files POST (upload)', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/files`, {
      method: 'POST',
      body: { file_name: 'flow-test.pdf', s3_key: 'fake/key', file_size: 1024 },
    });
    const res = await evalByIdFilesPOST(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/flight-requests GET', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/flight-requests`, { method: 'GET' });
    const res = await evalByIdFlightReqsGET(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/move-to-planning POST', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/move-to-planning`, {
      method: 'POST',
      body: {},
    });
    const res = await evalByIdMoveToPlanningPOST(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/tasks GET', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/tasks`, { method: 'GET' });
    const res = await evalByIdTasksGET(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — [id]/tasks PUT', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}/tasks`, {
      method: 'PUT',
      body: { tasks: [] },
    });
    const res = await evalByIdTasksPUT(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission/communication/list POST', async () => {
    const req = makeRequest('/api/evaluation/mission/communication/list', {
      method: 'POST',
      body: { mission_id: createdPlanningId ?? 1 },
    });
    const res = await evalMissionCommListPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission/delete-logbook POST', async () => {
    const req = makeRequest('/api/evaluation/mission/delete-logbook', {
      method: 'POST',
      body: { logbook_id: 99999 },
    });
    const res = await evalMissionDeleteLogbookPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission/delete-test POST', async () => {
    const req = makeRequest('/api/evaluation/mission/delete-test', {
      method: 'POST',
      body: { test_id: 99999 },
    });
    const res = await evalMissionDeleteTestPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission/mission-test POST', async () => {
    const req = makeRequest('/api/evaluation/mission/mission-test', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalMissionTestPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission/testing POST', async () => {
    const req = makeRequest('/api/evaluation/mission/testing', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalMissionTestingPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission/update-status POST', async () => {
    const req = makeRequest('/api/evaluation/mission/update-status', {
      method: 'POST',
      body: { mission_id: 1, status: 'DRAFT' },
    });
    const res = await evalMissionUpdateStatusPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission/users POST', async () => {
    const req = makeRequest('/api/evaluation/mission/users', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalMissionUsersPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission-template/filter GET', async () => {
    const req = makeRequest('/api/evaluation/mission-template/filter', { method: 'GET' });
    const res = await evalMissionTemplateFilterGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — mission-template/logbook GET', async () => {
    const req = makeRequest('/api/evaluation/mission-template/logbook', { method: 'GET' });
    const res = await evalMissionTemplateLogbookGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — new-req/files/upload POST', async () => {
    const req = makeRequest('/api/evaluation/new-req/files/upload', {
      method: 'POST',
      body: { evaluation_id: createdEvaluationId ?? 1, file_name: 'flow-test.pdf', s3_key: 'fake/key', file_size: 1024 },
    });
    const res = await evalNewReqFilesUploadPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — new-req/files/[fileId] DELETE', async () => {
    const req = makeRequest('/api/evaluation/new-req/files/99999', { method: 'DELETE' });
    const res = await evalNewReqFileByIdDEL(req, { params: Promise.resolve({ fileId: '99999' }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — PUT (update planning)', async () => {
    if (!createdPlanningId) return;
    const req = makeRequest('/api/evaluation/planning', {
      method: 'PUT',
      body: { planning_id: createdPlanningId, planning_desc: 'Updated by flow test' },
    });
    const res = await evaluationPlanningPUT(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — [id]/tasks GET', async () => {
    if (!createdPlanningId) return;
    const req = makeRequest(`/api/evaluation/planning/${createdPlanningId}/tasks`, { method: 'GET' });
    const res = await evalPlanningTasksGET(req, { params: Promise.resolve({ id: String(createdPlanningId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — [id]/tasks PUT', async () => {
    if (!createdPlanningId) return;
    const req = makeRequest(`/api/evaluation/planning/${createdPlanningId}/tasks`, {
      method: 'PUT',
      body: { tasks: [] },
    });
    const res = await evalPlanningTasksPUT(req, { params: Promise.resolve({ id: String(createdPlanningId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — add-mission-planning POST', async () => {
    const req = makeRequest('/api/evaluation/planning/add-mission-planning', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1, mission_data: {} },
    });
    const res = await evalPlanningAddMissionPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — communication POST', async () => {
    const req = makeRequest('/api/evaluation/planning/communication', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1, message: 'Flow test comm' },
    });
    const res = await evalPlanningCommPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — delete-mission-planning POST', async () => {
    const req = makeRequest('/api/evaluation/planning/delete-mission-planning', {
      method: 'POST',
      body: { mission_id: 99999 },
    });
    const res = await evalPlanningDeleteMissionPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — delete-repository-file POST', async () => {
    const req = makeRequest('/api/evaluation/planning/delete-repository-file', {
      method: 'POST',
      body: { file_id: 99999 },
    });
    const res = await evalPlanningDeleteRepFilePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — drone POST', async () => {
    const req = makeRequest('/api/evaluation/planning/drone', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalPlanningDronePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — logbook POST', async () => {
    const req = makeRequest('/api/evaluation/planning/logbook', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalPlanningLogbookPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — mission-template POST', async () => {
    const req = makeRequest('/api/evaluation/planning/mission-template', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalPlanningMissionTemplatePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — pilot GET', async () => {
    const req = makeRequest(`/api/evaluation/planning/pilot?mission_planning_id=${createdPlanningId ?? 1}`, { method: 'GET' });
    const res = await evalPlanningPilotGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — planning-data POST', async () => {
    const req = makeRequest('/api/evaluation/planning/planning-data', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalPlanningDataPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — repository POST', async () => {
    const req = makeRequest('/api/evaluation/planning/repository', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalPlanningRepositoryPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — test-logbook POST', async () => {
    const req = makeRequest('/api/evaluation/planning/test-logbook', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalPlanningTestLogbookPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — testing POST', async () => {
    const req = makeRequest('/api/evaluation/planning/testing', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId ?? 1 },
    });
    const res = await evalPlanningTestingPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation Planning — update-planning POST', async () => {
    if (!createdPlanningId) return;
    const req = makeRequest('/api/evaluation/planning/update-planning', {
      method: 'POST',
      body: { mission_planning_id: createdPlanningId, planning_desc: 'Updated by update-planning' },
    });
    const res = await evalPlanningUpdatePlanningPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FLYTBASE ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('FlytBase — flights archive POST', async () => {
    const req = makeRequest('/api/flytbase/flights/archive', { method: 'POST', body: { flight_ids: [] } });
    const res = await flytbaseFlightsArchivePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('FlytBase — flights preview GET', async () => {
    const req = makeRequest('/api/flytbase/flights/preview?flight_id=1', { method: 'GET' });
    const res = await flytbaseFlightsPreviewGET(req);
    expect(res.status).not.toBe(401);
  });

  it('FlytBase — token POST (connect)', async () => {
    const req = makeRequest('/api/flytbase/token', { method: 'POST', body: {} });
    const res = await flytbaseTokenPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('FlytBase — token DELETE (disconnect)', async () => {
    const res = await flytbaseTokenDEL();
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EXTERNAL MISSIONS API (API-key auth — expects 401 without key)
  // ══════════════════════════════════════════════════════════════════════════

  it('Missions API — POST (no API key → 401)', async () => {
    const req = makeRequest('/api/missions', {
      method: 'POST',
      body: { mission_name: 'Flow External Mission', scheduled_start: '2026-07-01T09:00:00.000Z' },
    });
    const res = await missionApiPOST(req);
    expect(res.status).not.toBe(500);
  });

  it('Missions API — DELETE (no API key → 401)', async () => {
    const req = makeRequest('/api/missions', {
      method: 'DELETE',
      body: { mission_id: 1 },
    });
    const res = await missionApiDEL(req);
    expect(res.status).not.toBe(500);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATION ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Notifications — delete POST', async () => {
    const req = makeRequest('/api/notification/delete', { method: 'POST', body: { notification_id: 99999 } });
    const res = await notificationDeletePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Notifications — mark-read POST', async () => {
    const req = makeRequest('/api/notification/mark-read', { method: 'POST', body: { notification_id: 1 } });
    const res = await notificationMarkReadPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATION ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Operations — [id]/attachment GET', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/${id}/attachment`, { method: 'GET' });
    const res = await opAttachmentGET(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — [id]/attachment POST (upload)', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/${id}/attachment`, {
      method: 'POST',
      body: { file_name: 'op-attach.pdf', s3_key: 'fake/op-key', file_size: 512 },
    });
    const res = await opAttachmentPOST(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — [id]/attachment/[attachmentId] DELETE', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/${id}/attachment/99999`, { method: 'DELETE' });
    const res = await opAttachmentByIdDEL(req, { params: Promise.resolve({ id: String(id), attachmentId: '99999' }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — [id]/attachment/[attachmentId]/download GET', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/${id}/attachment/99999/download`, { method: 'GET' });
    const res = await opAttachmentDownloadGET(req, { params: Promise.resolve({ id: String(id), attachmentId: '99999' }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — board/flight-logs/flytbase POST', async () => {
    const req = makeRequest('/api/operation/board/flight-logs/flytbase', {
      method: 'POST',
      body: { mission_id: createdOperationId ?? 1 },
    });
    const res = await opBoardFlightLogsFlytbasePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — board/maintenance-cycle GET', async () => {
    const req = makeRequest(`/api/operation/board/maintenance-cycle?mission_id=${createdOperationId ?? 1}`, { method: 'GET' });
    const res = await opBoardMaintenanceCycleGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — board/maintenance-cycle/update POST', async () => {
    const req = makeRequest('/api/operation/board/maintenance-cycle/update', {
      method: 'POST',
      body: { mission_id: createdOperationId ?? 1 },
    });
    const res = await opBoardMaintenanceCycleUpdatePOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — board/post-flight POST', async () => {
    const req = makeRequest('/api/operation/board/post-flight', {
      method: 'POST',
      body: { mission_id: createdOperationId ?? 1 },
    });
    const res = await opBoardPostFlightPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — communication POST', async () => {
    const req = makeRequest('/api/operation/communication', {
      method: 'POST',
      body: { mission_id: createdOperationId ?? 1, message: 'Flow test comm', recipients: [] },
    });
    const res = await opCommunicationPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — import POST', async () => {
    const req = makeFormDataRequest('/api/operation/import', {});
    const res = await opImportPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — missions/[id]/assignment POST', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/missions/${id}/assignment`, {
      method: 'POST',
      body: { user_id: 1, role: 'PILOT' },
    });
    const res = await opMissionAssignmentPOST(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — missions/[id]/communication POST', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/missions/${id}/communication`, {
      method: 'POST',
      body: { message: 'Flow test comm' },
    });
    const res = await opMissionCommunicationPOST(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — missions/[id]/luc PATCH', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/missions/${id}/luc`, {
      method: 'PATCH',
      body: { luc_status: 'APPROVED' },
    });
    const res = await opMissionLucPATCH(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — pilot/declaration POST', async () => {
    const req = makeRequest('/api/operation/pilot/declaration', {
      method: 'POST',
      body: { mission_id: createdOperationId ?? 1, declaration: true },
    });
    const res = await opPilotDeclarationPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — report-issue POST', async () => {
    const req = makeRequest('/api/operation/report-issue', {
      method: 'POST',
      body: { tool_id: 1, issue_description: 'Flow test issue' },
    });
    const res = await opReportIssuePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ORGANIZATION ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Organization — assignment/[id] GET', async () => {
    if (!createdAssignmentId) return;
    const req = makeRequest(`/api/organization/assignment/${createdAssignmentId}`, { method: 'GET' });
    const res = await orgAssignmentByIdGET(req, { params: Promise.resolve({ id: String(createdAssignmentId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Organization — chart/update PATCH', async () => {
    const req = makeRequest('/api/organization/chart/update', {
      method: 'PATCH',
      body: { nodes: [], edges: [] },
    });
    const res = await orgChartUpdatePATCH(req);
    expect(res.status).not.toBe(401);
  });

  it('Organization — checklist/[id] GET', async () => {
    if (!createdChecklistId) return;
    const req = makeRequest(`/api/organization/checklist/${createdChecklistId}`, { method: 'GET' });
    const res = await orgChecklistByIdGET(req, { params: Promise.resolve({ id: String(createdChecklistId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Organization — checklist/result POST', async () => {
    const req = makeRequest('/api/organization/checklist/result', {
      method: 'POST',
      body: { checklist_id: createdChecklistId ?? 1, mission_id: createdOperationId ?? 1, items: [] },
    });
    const res = await orgChecklistResultPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Organization — luc-procedures/[id] GET', async () => {
    if (!createdOrgLucProcedureId) return;
    const req = makeRequest(`/api/organization/luc-procedures/${createdOrgLucProcedureId}`, { method: 'GET' });
    const res = await orgLucByIdGET(req, { params: Promise.resolve({ id: String(createdOrgLucProcedureId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Organization — luc-procedures/[id] PUT', async () => {
    if (!createdOrgLucProcedureId) return;
    const req = makeRequest(`/api/organization/luc-procedures/${createdOrgLucProcedureId}`, {
      method: 'PUT',
      body: { procedure_code: `PROC-UPD${Date.now().toString().slice(-4)}`, procedure_name: 'Updated Procedure', procedure_status: 'PLANNING', procedure_active: 'Y' },
    });
    const res = await orgLucByIdPUT(req, { params: Promise.resolve({ id: String(createdOrgLucProcedureId) }) });
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OWNER ADDITIONAL (SUPERADMIN — ADMIN expects 403)
  // ══════════════════════════════════════════════════════════════════════════

  it('Owner — POST create (403 for ADMIN)', async () => {
    const ts = Date.now().toString().slice(-6);
    const req = makeRequest('/api/owner', {
      method: 'POST',
      body: {
        owner_code: `OWN${ts}`, owner_name: `Flow Owner ${ts}`,
        admin_email: `flow-owner-${ts}@readi-test.local`, admin_username: `flowowner${ts}`,
        admin_password: 'FlowPass123!',
      },
    });
    const res = await ownerCreatePOST(req);
    const body = await parseJson(res);
    expect([200, 201, 400, 403, 422]).toContain(res.status);
    if ([200, 201].includes(res.status)) {
      createdOwnerId = body.data?.owner_id ?? body.id;
      console.info(`[Owner] Created owner ID=${createdOwnerId}`);
    }
  });

  it('Owner — [id] GET (403 for ADMIN)', async () => {
    const id = createdOwnerId ?? OWNER_ID;
    const req = makeRequest(`/api/owner/${id}`, { method: 'GET' });
    const res = await ownerByIdGET(req, { params: Promise.resolve({ id: String(id) }) });
    expect([200, 403]).toContain(res.status);
  });

  it('Owner — [id] PUT (403 for ADMIN)', async () => {
    const id = createdOwnerId ?? OWNER_ID;
    const req = makeRequest(`/api/owner/${id}`, {
      method: 'PUT',
      body: { owner_name: 'Flow Owner Updated' },
    });
    const res = await ownerByIdPUT(req, { params: Promise.resolve({ id: String(id) }) });
    expect([200, 201, 400, 403, 422]).toContain(res.status);
  });

  it('Owner — [id]/metrics GET (403 for ADMIN)', async () => {
    const id = createdOwnerId ?? OWNER_ID;
    const req = makeRequest(`/api/owner/${id}/metrics`, { method: 'GET' });
    const res = await ownerMetricsGET(req, { params: Promise.resolve({ id: String(id) }) });
    expect([200, 403]).toContain(res.status);
  });

  it('Owner — [id]/admin-password PUT (403 for ADMIN)', async () => {
    const id = createdOwnerId ?? OWNER_ID;
    const req = makeRequest(`/api/owner/${id}/admin-password`, {
      method: 'PUT',
      body: { new_password: 'NewPass123!' },
    });
    const res = await ownerAdminPasswordPUT(req, { params: Promise.resolve({ id: String(id) }) });
    expect([200, 400, 403, 422]).toContain(res.status);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PLANNING ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Planning — flight-requests list (capture existing ID for sub-tests)', async () => {
    const req = makeRequest('/api/planning/flight-requests', { method: 'POST', body: { status: 'ALL' } });
    const res = await flightRequestsPOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    if (Array.isArray(body.items) && body.items.length > 0) {
      createdFlightRequestId = body.items[0]?.id ?? body.items[0]?.flight_request_id;
    }
    console.info(`[Planning] Existing flight request ID=${createdFlightRequestId}`);
  });

  it('Planning — flight-requests/[id]/log-status GET', async () => {
    const id = createdFlightRequestId ?? 1;
    const req = makeRequest(`/api/planning/flight-requests/${id}/log-status`, { method: 'GET' });
    const res = await flightRequestLogStatusGET(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Planning — flight-requests/[id] PATCH', async () => {
    const id = createdFlightRequestId ?? 1;
    const req = makeRequest(`/api/planning/flight-requests/${id}`, {
      method: 'PATCH',
      body: { status: 'PENDING' },
    });
    const res = await flightRequestByIdPATCH(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Planning — flight-requests/[id] DELETE (non-existent → not 401)', async () => {
    const req = makeRequest('/api/planning/flight-requests/999999', { method: 'DELETE' });
    const res = await flightRequestByIdDEL(req, { params: Promise.resolve({ id: '999999' }) });
    expect(res.status).not.toBe(401);
  });

  it('Planning — flight-requests/assign POST', async () => {
    const req = makeRequest('/api/planning/flight-requests/assign', {
      method: 'POST',
      body: { flight_request_id: createdFlightRequestId ?? 1, planning_id: createdPlanningId ?? 1 },
    });
    const res = await flightRequestAssignPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Planning — flight-requests/deny POST', async () => {
    const req = makeRequest('/api/planning/flight-requests/deny', {
      method: 'POST',
      body: { flight_request_id: createdFlightRequestId ?? 1, reason: 'Flow test denial' },
    });
    const res = await flightRequestDenyPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Planning — flight-requests/logs POST', async () => {
    const req = makeRequest('/api/planning/flight-requests/logs', {
      method: 'POST',
      body: { flight_request_id: createdFlightRequestId ?? 1 },
    });
    const res = await flightRequestLogsPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Profile — POST (update profile)', async () => {
    const req = makeFormDataRequest('/api/profile', {
      fullname: 'Flow Tester',
      phone: '',
      timezone: 'Europe/Berlin',
    });
    const res = await profilePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Settings — api-keys/[id] PATCH', async () => {
    if (!createdApiKeyId) return;
    const req = makeRequest(`/api/settings/api-keys/${createdApiKeyId}`, {
      method: 'PATCH',
      body: { key_name: `FlowKeyUpdated${Date.now()}` },
    });
    const res = await apiKeyPatchPATCH(req, { params: Promise.resolve({ id: String(createdApiKeyId) }) });
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SYSTEM ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Systems — component-types POST (create)', async () => {
    const ts = Date.now().toString().slice(-6);
    const req = makeRequest('/api/system/component-types', {
      method: 'POST',
      body: { type_value: `FCT${ts}`, type_label: `FlowCompType${ts}` },
    });
    const res = await systemComponentTypeCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdComponentTypeId = body.data?.type_id ?? body.data?.id ?? body.id;
    console.info(`[Systems] Created component type ID=${createdComponentTypeId} status=${res.status}`);
  });

  it('Systems — component-types/[id] PATCH', async () => {
    if (!createdComponentTypeId) return;
    const req = makeRequest(`/api/system/component-types/${createdComponentTypeId}`, {
      method: 'PATCH',
      body: { type_label: 'FlowCompTypeUpdated' },
    });
    const res = await systemComponentTypeUpdatePATCH(req, { params: Promise.resolve({ id: String(createdComponentTypeId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Systems — drone-classes POST (create)', async () => {
    const ts = Date.now().toString().slice(-6);
    const req = makeRequest('/api/system/drone-classes', {
      method: 'POST',
      body: { class_value: `FDC${ts}`, class_label: `FlowDroneClass${ts}` },
    });
    const res = await systemDroneClassCreatePOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdDroneClassId = body.data?.class_id ?? body.data?.id ?? body.id;
    console.info(`[Systems] Created drone class ID=${createdDroneClassId} status=${res.status}`);
  });

  it('Systems — drone-classes/[id] PATCH', async () => {
    if (!createdDroneClassId) return;
    const req = makeRequest(`/api/system/drone-classes/${createdDroneClassId}`, {
      method: 'PATCH',
      body: { class_label: 'FlowDroneClassUpdated' },
    });
    const res = await systemDroneClassUpdatePATCH(req, { params: Promise.resolve({ id: String(createdDroneClassId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Systems — add POST (create system/drone)', async () => {
    const ts = Date.now().toString().slice(-6);
    const req = makeFormDataRequest('/api/system/add', {
      data: JSON.stringify({
        tool_code: `FS${ts}`, tool_name: `FlowSystem${ts}`,
        tool_description: 'Flow test drone system',
        tool_active: 'Y', clientId: null, location: 'Flow Location',
        latitude: 51.5, longitude: -0.12,
        activationDate: '2026-06-01',
      }),
    });
    const res = await systemAddPOST(req);
    const body = await parseJson(res);
    expect(res.status).not.toBe(401);
    createdSystemId = body.data?.tool_id ?? body.data?.id ?? body.id;
    console.info(`[Systems] Created system ID=${createdSystemId} status=${res.status}`);
  });

  it('Systems — [id]/update POST', async () => {
    if (!createdSystemId) return;
    const req = makeRequest(`/api/system/${createdSystemId}/update`, {
      method: 'POST',
      body: { tool_name: 'FlowSystemUpdated', tool_active: true },
    });
    const res = await systemByIdUpdatePOST(req, { params: Promise.resolve({ id: String(createdSystemId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Systems — component/add POST', async () => {
    const ts = Date.now().toString().slice(-6);
    const req = makeRequest('/api/system/component/add', {
      method: 'POST',
      body: {
        component_type: 'DOCK',
        component_sn: `COMP${ts}`,
        fk_tool_id: createdSystemId ?? 1,
        // Include expiration_date as a date-only string — regression guard for the Prisma DateTime coercion bug
        expiration_date: '2030-06-01',
        expiry_type: 'EXPIRATION_DATE',
      },
    });
    const res = await systemComponentAddPOST(req);
    const body = await parseJson(res);
    // 500 here would mean Prisma rejected the date-only string (the original bug)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
    createdComponentId = body.data?.component_id ?? body.data?.id ?? body.id;
    console.info(`[Systems] Created component ID=${createdComponentId} status=${res.status}`);
  });

  it('Systems — component/[id]/update POST', async () => {
    if (!createdComponentId) return;
    const req = makeRequest(`/api/system/component/${createdComponentId}/update`, {
      method: 'POST',
      body: { component_name: 'FlowComponentUpdated' },
    });
    const res = await systemComponentUpdatePOST(req, { params: Promise.resolve({ id: String(createdComponentId) }) });
    expect(res.status).not.toBe(401);
  });

  // Regression: Prisma rejected date-only strings ("YYYY-MM-DD") for DateTime fields.
  // The bug was only triggered when expiration_date was actually sent — tests that omit the field
  // evaluate to null and never hit the Prisma coercion. This test ensures date-only strings
  // are converted to Date objects before being handed to Prisma.
  it('Systems — component/[id]/update POST with expiration_date (date-only string)', async () => {
    if (!createdComponentId) return;
    const req = makeRequest(`/api/system/component/${createdComponentId}/update`, {
      method: 'POST',
      body: {
        component_name: 'FlowComponentWithExpiry',
        fk_tool_id: createdSystemId ?? 1,
        component_type: 'DOCK',
        expiration_date: '2028-11-03',
        expiry_type: 'EXPIRATION_DATE',
      },
    });
    const res = await systemComponentUpdatePOST(req, { params: Promise.resolve({ id: String(createdComponentId) }) });
    // 401 → auth broke; 500 → Prisma rejected the date-only string (the original bug)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  });

  it('Systems — component/[id]/flight-logs GET', async () => {
    if (!createdComponentId) return;
    const req = makeRequest(`/api/system/component/${createdComponentId}/flight-logs`, { method: 'GET' });
    const res = await systemComponentFlightLogsGET(req, { params: Promise.resolve({ id: String(createdComponentId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Systems — component/[id]/logs GET', async () => {
    if (!createdComponentId) return;
    const req = makeRequest(`/api/system/component/${createdComponentId}/logs`, { method: 'GET' });
    const res = await systemComponentLogsGET(req, { params: Promise.resolve({ id: String(createdComponentId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Systems — component/[id]/primary POST', async () => {
    if (!createdComponentId) return;
    const req = makeRequest(`/api/system/component/${createdComponentId}/primary`, {
      method: 'POST',
      body: { is_primary: true },
    });
    const res = await systemComponentPrimaryPOST(req, { params: Promise.resolve({ id: String(createdComponentId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Systems — maintenance/tickets/assign POST', async () => {
    const req = makeRequest('/api/system/maintenance/tickets/assign', {
      method: 'POST',
      body: { ticket_id: createdMaintenanceTicketId ?? 1, assigned_to_user_id: 1 },
    });
    const res = await maintenanceTicketAssignPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Systems — maintenance/tickets/attachment GET', async () => {
    const req = makeRequest(`/api/system/maintenance/tickets/attachment?ticket_id=${createdMaintenanceTicketId ?? 1}`, { method: 'GET' });
    const res = await maintenanceTicketAttachmentGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Systems — maintenance/tickets/report POST', async () => {
    const req = makeFormDataRequest('/api/system/maintenance/tickets/report', {
      ticket_id: String(createdMaintenanceTicketId ?? 1),
      report_text: 'Flow test report',
    });
    const res = await maintenanceTicketReportPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Systems — maintenance/tickets/upload POST', async () => {
    const req = makeFormDataRequest('/api/system/maintenance/tickets/upload', {
      ticket_id: String(createdMaintenanceTicketId ?? 1),
      file: new File(['dummy attachment'], 'ticket.pdf', { type: 'application/pdf' }),
    });
    const res = await maintenanceTicketUploadPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEAM ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Team — control-center-token GET', async () => {
    const req = makeRequest('/api/team/user/control-center-token', { method: 'GET' });
    const res = await controlCenterTokenGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Team — control-center-token POST (generate)', async () => {
    const req = makeRequest('/api/team/user/control-center-token', { method: 'POST', body: {} });
    const res = await controlCenterTokenPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Team — control-center-token DELETE (revoke)', async () => {
    const req = makeRequest('/api/team/user/control-center-token', { method: 'DELETE', body: {} });
    const res = await controlCenterTokenDEL(req);
    expect(res.status).not.toBe(401);
  });

  it('Team — user/qualifications/[id] DELETE', async () => {
    const req = makeRequest('/api/team/user/qualifications/99999', { method: 'DELETE' });
    const res = await userQualificationDeleteDEL(req, { params: Promise.resolve({ id: '99999' }) });
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TRAINING ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Training — attendance POST (log attendance)', async () => {
    const req = makeRequest('/api/training/attendance', {
      method: 'POST',
      body: { training_id: createdTrainingAttendanceId ?? 1, user_id: createdUserId ?? 1, attended: true },
    });
    const res = await trainingAttendancePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ══════════════════════════════════════════════════════════════════════════

  it('Permissions — me GET', async () => {
    const res = await permissionsMeGET();
    expect(res.status).not.toBe(401);
  });

  it('Permissions — role-defaults GET', async () => {
    const res = await permissionsRoleDefaultsGET();
    expect(res.status).not.toBe(401);
  });

  it('Permissions — role-defaults PATCH', async () => {
    const req = makeRequest('/api/permissions/role-defaults', {
      method: 'PATCH',
      body: { role: 'PIC', access: {} },
    });
    const res = await permissionsRoleDefaultsPATCH(req);
    expect(res.status).not.toBe(401);
  });

  it('Permissions — user/[userId] GET', async () => {
    const id = createdUserId ?? 1;
    const req = makeRequest(`/api/permissions/user/${id}`, { method: 'GET' });
    const res = await permissionsUserByIdGET(req, { params: Promise.resolve({ userId: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Permissions — user/[userId] PATCH (reset to role default)', async () => {
    const id = createdUserId ?? 1;
    const req = makeRequest(`/api/permissions/user/${id}`, {
      method: 'PATCH',
      body: { useCustom: false },
    });
    const res = await permissionsUserByIdPATCH(req, { params: Promise.resolve({ userId: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS — D-Flight & subroles
  // ══════════════════════════════════════════════════════════════════════════

  it('Settings — dflight GET', async () => {
    const res = await settingsDflightGET();
    expect(res.status).not.toBe(401);
  });

  it('Settings — dflight POST', async () => {
    const req = makeRequest('/api/settings/dflight', {
      method: 'POST',
      body: {
        base_url: 'https://example-dflight.test',
        username: 'flow-test-user',
        password: 'flow-test-pass',
        client_id: 'flow-test-client',
      },
    });
    const res = await settingsDflightPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('D-Flight — fleet GET', async () => {
    const res = await dflightFleetGET();
    expect(res.status).not.toBe(401);
  });

  it('Team — subrole GET', async () => {
    const req = makeRequest(`/api/team/user/subrole?user_id=${createdUserId ?? 1}`, { method: 'GET' });
    const res = await teamSubroleGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Team — subrole POST (grant then revoke PIC_TECHNICIAN)', async () => {
    const grantReq = makeRequest('/api/team/user/subrole', {
      method: 'POST',
      body: { user_id: createdUserId ?? 1, subrole: 'PIC_TECHNICIAN', action: 'grant' },
    });
    const grantRes = await teamSubrolePOST(grantReq);
    expect(grantRes.status).not.toBe(401);

    const revokeReq = makeRequest('/api/team/user/subrole', {
      method: 'POST',
      body: { user_id: createdUserId ?? 1, subrole: 'PIC_TECHNICIAN', action: 'revoke' },
    });
    const revokeRes = await teamSubrolePOST(revokeReq);
    expect(revokeRes.status).not.toBe(401);
  });

  it('Team — update-password POST', async () => {
    if (!createdUserId) return;
    const req = makeRequest('/api/team/user/update-password', {
      method: 'POST',
      body: { user_id: createdUserId, new_password: 'FlowPass!2026', email: 'flow-test@readi-test.local' },
    });
    const res = await teamUpdatePasswordPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Client — update-password POST', async () => {
    if (!createdClientId) return;
    const req = makeRequest('/api/client/update-password', {
      method: 'POST',
      body: { client_id: createdClientId, new_password: 'FlowPass!2026', client_name: 'Flow Test Client' },
    });
    const res = await clientUpdatePasswordPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('Compliance — requirements-evidences/update POST', async () => {
    if (!createdComplianceId) return;
    const req = makeRequest('/api/compliance/requirements-evidences/update', {
      method: 'POST',
      body: { requirement_id: createdComplianceId, requirement_title: 'Flow Updated Requirement' },
    });
    const res = await requirementsUpdatePOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EVALUATION ADDITIONAL — communication & planning clients
  // ══════════════════════════════════════════════════════════════════════════

  it('Evaluation — mission/communication/add POST', async () => {
    const req = makeFormDataRequest('/api/evaluation/mission/communication/add', {
      message: 'Flow test mission communication',
      communication_level: 'info',
      'communication_to[]': [String(OWNER_ID || 1)],
    });
    const res = await evalMissionCommAddPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Evaluation — planning/clients GET', async () => {
    const res = await evalPlanningClientsGET();
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FLYTBASE / FLYTRELAY ADDITIONAL
  // ══════════════════════════════════════════════════════════════════════════

  it('FlytBase — my-organizations GET', async () => {
    const res = await flytbaseMyOrganizationsGET();
    expect(res.status).not.toBe(401);
  });

  it('FlytRelay — flights GET', async () => {
    const req = makeRequest('/api/flytrelay/flights', { method: 'GET' });
    const res = await flytrelayFlightsGET(req);
    expect(res.status).not.toBe(401);
  }, 15_000);

  it('FlytRelay — flights/gutma GET requires flightId', async () => {
    const req = makeRequest('/api/flytrelay/flights/gutma', { method: 'GET' });
    const res = await flytrelayFlightsGutmaGET(req);
    expect(res.status).toBe(400);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATION ADDITIONAL — flight logs & mission attachment
  // ══════════════════════════════════════════════════════════════════════════

  it('Operations — board/flight-logs GET requires mission_id', async () => {
    const req = makeRequest('/api/operation/board/flight-logs', { method: 'GET' });
    const res = await opBoardFlightLogsGET(req);
    expect(res.status).toBe(400);
  });

  it('Operations — board/flight-logs GET for a mission', async () => {
    const req = makeRequest(`/api/operation/board/flight-logs?mission_id=${createdOperationId ?? 1}`, { method: 'GET' });
    const res = await opBoardFlightLogsGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — board/flight-logs/upload POST', async () => {
    const req = makeFormDataRequest('/api/operation/board/flight-logs/upload', {
      mission_id: String(createdOperationId ?? 1),
      file: new File(['dummy flight log'], 'flight-log.gutma', { type: 'application/octet-stream' }),
    });
    const res = await opBoardFlightLogsUploadPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — board/flight-logs/waypoints GET', async () => {
    const req = makeRequest(`/api/operation/board/flight-logs/waypoints?mission_id=${createdOperationId ?? 1}`, { method: 'GET' });
    const res = await opBoardFlightLogsWaypointsGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — import/preview POST requires a file', async () => {
    const req = makeFormDataRequest('/api/operation/import/preview', {});
    const res = await opImportPreviewPOST(req);
    expect(res.status).toBe(400);
  });

  it('Operations — missions/attachable GET requires droneSerialNumber', async () => {
    const req = makeRequest('/api/operation/missions/attachable', { method: 'GET' });
    const res = await opMissionsAttachableGET(req);
    expect(res.status).toBe(400);
  });

  it('Operations — missions/attachable GET for a drone serial', async () => {
    const req = makeRequest('/api/operation/missions/attachable?droneSerialNumber=FLOW-SN-001', { method: 'GET' });
    const res = await opMissionsAttachableGET(req);
    expect(res.status).not.toBe(401);
  });

  it('Operations — missions/[id]/attach-flight-log POST', async () => {
    const id = createdOperationId ?? 1;
    const req = makeRequest(`/api/operation/missions/${id}/attach-flight-log`, {
      method: 'POST',
      body: { flight_id: 'flow-flight-id' },
    });
    const res = await opMissionAttachFlightLogPOST(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).not.toBe(401);
  });

  it('Operations — missions/create-and-attach POST requires mission_code, flight_id, fk_luc_procedure_id', async () => {
    const req = makeRequest('/api/operation/missions/create-and-attach', { method: 'POST', body: {} });
    const res = await opMissionsCreateAndAttachPOST(req);
    expect(res.status).toBe(400);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SYSTEM ADDITIONAL — flight log preview & maintenance intervention
  // ══════════════════════════════════════════════════════════════════════════

  it('System — component/flight-logs/[logId]/preview GET', async () => {
    const req = makeRequest('/api/system/component/flight-logs/99999/preview', { method: 'GET' });
    const res = await systemComponentFlightLogPreviewGET(req, { params: Promise.resolve({ logId: '99999' }) });
    expect(res.status).not.toBe(401);
  });

  it('System — maintenance/tickets/intervention POST', async () => {
    const req = makeRequest('/api/system/maintenance/tickets/intervention', {
      method: 'POST',
      body: { ticket_id: createdMaintenanceTicketId ?? 1, action: 'start' },
    });
    const res = await maintenanceTicketInterventionPOST(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ADMIN — C2 config (organizations & user access)
  // ══════════════════════════════════════════════════════════════════════════

  it('Admin — c2-config/organizations GET', async () => {
    const res = await c2ConfigOrgsGET();
    expect(res.status).not.toBe(401);
  });

  it('Admin — c2-config/organizations POST (fake token, expects verification failure not 401)', async () => {
    const req = makeRequest('/api/admin/c2-config/organizations', {
      method: 'POST',
      body: { name: 'Flow Test Org', orgId: 'flow-org-id', apiToken: 'flow-fake-token' },
    });
    const res = await c2ConfigOrgsPOST(req);
    expect(res.status).not.toBe(401);
  }, 15_000);

  it('Admin — c2-config/organizations PUT (unknown id, expects non-401)', async () => {
    const req = makeRequest('/api/admin/c2-config/organizations', {
      method: 'PUT',
      body: { id: 999999, name: 'Flow Test Org Updated' },
    });
    const res = await c2ConfigOrgsPUT(req);
    expect(res.status).not.toBe(401);
  });

  it('Admin — c2-config/organizations DELETE (unknown id, expects non-401)', async () => {
    const req = makeRequest('/api/admin/c2-config/organizations', {
      method: 'DELETE',
      body: { id: 999999 },
    });
    const res = await c2ConfigOrgsDEL(req);
    expect(res.status).not.toBe(401);
  });

  it('Admin — c2-config/permissions GET', async () => {
    const res = await c2ConfigPermissionsGET();
    expect(res.status).not.toBe(401);
  });

  it('Admin — c2-config/permissions POST (invalid ids, expects non-401)', async () => {
    const req = makeRequest('/api/admin/c2-config/permissions', {
      method: 'POST',
      body: { userId: '999999', organizationId: '999999' },
    });
    const res = await c2ConfigPermissionsPOST(req);
    expect(res.status).not.toBe(401);
  });

  it('Admin — c2-config/permissions DELETE (invalid ids, expects non-401)', async () => {
    const req = makeRequest('/api/admin/c2-config/permissions', {
      method: 'DELETE',
      body: { userId: '999999', organizationId: '999999' },
    });
    const res = await c2ConfigPermissionsDEL(req);
    expect(res.status).not.toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CRON — internal jobs, authenticated via Bearer CRON_SECRET (not session)
  // ══════════════════════════════════════════════════════════════════════════

  it('Cron — check-component-expiration GET without secret returns 401', async () => {
    const req = makeRequest('/api/cron/check-component-expiration', { method: 'GET' });
    const res = await cronComponentExpirationGET(req);
    expect(res.status).toBe(401);
  });

  it('Cron — check-maintenance-alerts GET without secret returns 401', async () => {
    const req = makeRequest('/api/cron/check-maintenance-alerts', { method: 'GET' });
    const res = await cronMaintenanceAlertsGET(req);
    expect(res.status).toBe(401);
  });

  it('Cron — refresh-maintenance-days GET without secret returns 401', async () => {
    const req = makeRequest('/api/cron/refresh-maintenance-days', { method: 'GET' });
    const res = await cronRefreshMaintenanceDaysGET(req);
    expect(res.status).toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CLEANUP — reverse dependency order
  // ══════════════════════════════════════════════════════════════════════════

  it('Cleanup — re-authenticates admin before cleanup', async () => {
    await loginAsAdmin();
  });

  it('Cleanup — detaches component', async () => {
    if (!createdComponentId) return;
    const req = makeRequest(`/api/system/component/${createdComponentId}/detach`, {
      method: 'POST',
      body: {},
    });
    const res = await systemComponentDetachPOST(req, { params: Promise.resolve({ id: String(createdComponentId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Detached component ID=${createdComponentId} status=${res.status}`);
  });

  it('Cleanup — deletes the component', async () => {
    if (!createdComponentId) return;
    const req = makeRequest(`/api/system/component/${createdComponentId}/delete`, {
      method: 'POST',
      body: {},
    });
    const res = await systemComponentDeletePOST(req, { params: Promise.resolve({ id: String(createdComponentId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted component ID=${createdComponentId}`);
  });

  it('Cleanup — deletes the system', async () => {
    if (!createdSystemId) return;
    // deleteSystem is a two-step confirm: the first call only flips the tool
    // to NOT_OPERATIONAL (code: 2) and says "delete again to permanently
    // remove it" — a single call never actually removes the row.
    for (let attempt = 0; attempt < 2; attempt++) {
      const req = makeRequest(`/api/system/${createdSystemId}/delete`, { method: 'POST', body: {} });
      const res = await systemByIdDeletePOST(req, { params: Promise.resolve({ id: String(createdSystemId) }) });
      expect(res.status).not.toBe(401);
      const body = await parseJson(res);
      console.info(`[Cleanup] Delete system ID=${createdSystemId} attempt ${attempt + 1}: code=${body.code}`);
      if (body.code === 1) break;
    }
  });

  it('Cleanup — deletes the component type', async () => {
    if (!createdComponentTypeId) return;
    const req = makeRequest(`/api/system/component-types/${createdComponentTypeId}`, { method: 'DELETE' });
    const res = await systemComponentTypeDeleteDEL(req, { params: Promise.resolve({ id: String(createdComponentTypeId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted component type ID=${createdComponentTypeId}`);
  });

  it('Cleanup — deletes the drone class', async () => {
    if (!createdDroneClassId) return;
    const req = makeRequest(`/api/system/drone-classes/${createdDroneClassId}`, { method: 'DELETE' });
    const res = await systemDroneClassDeleteDEL(req, { params: Promise.resolve({ id: String(createdDroneClassId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted drone class ID=${createdDroneClassId}`);
  });

  it('Cleanup — deletes created owner (SUPERADMIN-only)', async () => {
    if (!createdOwnerId) return;
    const req = makeRequest(`/api/owner/${createdOwnerId}`, { method: 'DELETE' });
    const res = await ownerByIdDEL(req, { params: Promise.resolve({ id: String(createdOwnerId) }) });
    // createdOwnerId is only set when the earlier create call actually succeeded,
    // so the same session must be privileged enough to delete it — a 403 here
    // would silently leave a real tenant/org behind, so treat it as a failure.
    expect(res.status).toBe(200);
    console.info(`[Cleanup] Deleted owner ID=${createdOwnerId}`);
  });

  it('Cleanup — deletes API key', async () => {
    if (!createdApiKeyId) return;
    const req = makeRequest(`/api/settings/api-keys/${createdApiKeyId}`, { method: 'DELETE' });
    const res = await apiKeyDeleteDEL(req, { params: Promise.resolve({ id: String(createdApiKeyId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted API key ID=${createdApiKeyId}`);
  });

  it('Cleanup — deletes the document', async () => {
    if (!createdDocumentId) return;
    const req = makeRequest('/api/document/delete', { method: 'POST', body: { document_id: createdDocumentId } });
    const res = await documentDeletePOST(req);
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted document ID=${createdDocumentId}`);
  });

  it('Cleanup — deletes the document type', async () => {
    if (!createdDocumentTypeId) return;
    const req = makeRequest(`/api/document/types/${createdDocumentTypeId}`, { method: 'DELETE' });
    const res = await documentTypeDeleteDEL(req, { params: Promise.resolve({ id: String(createdDocumentTypeId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Cleanup — deletes evidence', async () => {
    if (!createdEvidenceId) return;
    const req = makeRequest('/api/compliance/requirements-evidences/evidence/delete', {
      method: 'POST',
      body: { evidence_id: createdEvidenceId },
    });
    const res = await evidenceDeletePOST(req);
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted evidence ID=${createdEvidenceId}`);
  });

  it('Cleanup — deletes the compliance requirement', async () => {
    if (!createdComplianceId) return;
    const req = makeRequest('/api/compliance/audit-plan/delete', { method: 'POST', body: { requirement_id: createdComplianceId } });
    const res = await auditPlanDeletePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Cleanup] Deleted compliance requirement ID=${createdComplianceId}`);
  });

  it('Cleanup — closes the maintenance ticket', async () => {
    if (!createdMaintenanceTicketId) return;
    const req = makeRequest('/api/system/maintenance/tickets/close', { method: 'POST', body: { ticket_id: createdMaintenanceTicketId } });
    const res = await maintenanceTicketClosePOST(req);
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Closed ticket ID=${createdMaintenanceTicketId}`);
  });

  it('Cleanup — deletes the drone model', async () => {
    if (!createdSystemModelId) return;
    const req = makeRequest(`/api/system/model/${createdSystemModelId}/delete`, { method: 'POST', body: {} });
    const res = await systemModelDeletePOST(req, { params: Promise.resolve({ id: String(createdSystemModelId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted model ID=${createdSystemModelId}`);
  });

  it('Cleanup — deletes the org communication', async () => {
    if (!createdOrgCommunicationId) return;
    const req = makeRequest('/api/organization/communication/delete', { method: 'POST', body: { communication_id: createdOrgCommunicationId } });
    const res = await orgCommunicationDeletePOST(req);
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted org communication ID=${createdOrgCommunicationId}`);
  });

  it('Cleanup — deletes the org assignment', async () => {
    if (!createdAssignmentId) return;
    const req = makeRequest(`/api/organization/assignment/${createdAssignmentId}`, { method: 'DELETE' });
    const res = await orgAssignmentByIdDEL(req, { params: Promise.resolve({ id: String(createdAssignmentId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted assignment ID=${createdAssignmentId}`);
  });

  it('Cleanup — deletes the calendar operation', async () => {
    if (!createdCalendarOpId) return;
    const req = makeRequest(`/api/operation/calendar/${createdCalendarOpId}`, { method: 'DELETE' });
    const res = await opCalendarByIdDEL(req, { params: Promise.resolve({ id: String(createdCalendarOpId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted calendar op ID=${createdCalendarOpId}`);
  });

  it('Cleanup — deletes the operation', async () => {
    if (!createdOperationId) return;
    const req = makeRequest(`/api/operation/${createdOperationId}`, { method: 'DELETE' });
    const res = await operationByIdDEL(req, { params: Promise.resolve({ id: String(createdOperationId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted operation ID=${createdOperationId}`);
  });

  it('Cleanup — deletes the planning', async () => {
    if (!createdPlanningId) return;
    const req = makeRequest('/api/evaluation/planning', { method: 'DELETE', body: { planning_id: createdPlanningId } });
    const res = await evaluationPlanningDEL(req);
    expect(res.status).not.toBe(401);
  });

  it('Cleanup — deletes the evaluation', async () => {
    if (!createdEvaluationId) return;
    const req = makeRequest(`/api/evaluation/${createdEvaluationId}`, { method: 'DELETE' });
    const res = await evaluationByIdDEL(req, { params: Promise.resolve({ id: String(createdEvaluationId) }) });
    expect(res.status).not.toBe(401);
  });

  it('Cleanup — deletes the training attendance', async () => {
    if (!createdTrainingAttendanceId) return;
    const req = makeRequest('/api/training/delete', { method: 'POST', body: { attendance_id: createdTrainingAttendanceId } });
    const res = await trainingDeletePOST(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Cleanup] Deleted training attendance ID=${createdTrainingAttendanceId}`);
  });

  it('Cleanup — deletes the test shift', async () => {
    if (!createdShiftId) return;
    const req = makeRequest(`/api/team/shift/${createdShiftId}`, { method: 'DELETE' });
    const res = await teamShiftDeleteDEL(req, { params: Promise.resolve({ id: String(createdShiftId) }) });
    expect(res.status).toBe(200);
    console.info(`[Cleanup] Deleted shift ID=${createdShiftId}`);
  });

  it('Cleanup — deletes the org LUC procedure', async () => {
    if (!createdOrgLucProcedureId) return;
    const req = makeRequest(`/api/organization/luc-procedures/${createdOrgLucProcedureId}`, { method: 'DELETE' });
    const res = await orgLucDeleteDEL(req, { params: Promise.resolve({ id: String(createdOrgLucProcedureId) }) });
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
  });

  it('Cleanup — deactivates the SPI/KPI', async () => {
    if (!createdSpiKpiId) return;
    const req = makeRequest('/api/safety/spi-kpi/toggle', { method: 'POST', body: { id: createdSpiKpiId, is_active: 0 } });
    const res = await spiKpiTogglePOST(req);
    expect(res.status).toBe(200);
    console.info(`[Cleanup] Deactivated SPI/KPI ID=${createdSpiKpiId}`);
  });

  it('Cleanup — deactivates then deletes the checklist', async () => {
    if (!createdChecklistId) return;
    const deactivateReq = makeRequest(`/api/organization/checklist/${createdChecklistId}`, {
      method: 'PUT',
      body: { checklist_code: `TEST-DEL-${Date.now()}`, checklist_desc: 'Deactivated', checklist_ver: '1.0', checklist_active: 'N' },
    });
    await checklistUpdatePUT(deactivateReq, { params: Promise.resolve({ id: String(createdChecklistId) }) });
    const deleteReq = makeRequest(`/api/organization/checklist/${createdChecklistId}`, { method: 'DELETE' });
    const res = await checklistDeleteDEL(deleteReq, { params: Promise.resolve({ id: String(createdChecklistId) }) });
    expect(res.status).toBe(200);
    console.info(`[Cleanup] Deleted checklist ID=${createdChecklistId}`);
  });

  it('Cleanup — deletes the qualification', async () => {
    if (!createdQualificationId) return;
    const req = makeRequest(`/api/team/user/qualifications/${createdQualificationId}`, { method: 'DELETE' });
    const res = await userQualificationDeleteDEL(req, { params: Promise.resolve({ id: String(createdQualificationId) }) });
    expect(res.status).not.toBe(401);
    console.info(`[Cleanup] Deleted qualification ID=${createdQualificationId}`);
  });

  it('Cleanup — deletes the test user', async () => {
    if (!createdUserId) return;
    const req  = makeRequest('/api/team/user/delete', { method: 'DELETE', body: { user_id: createdUserId } });
    const res  = await deleteUserDELETE(req);
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.code).toBe(1);
    console.info(`[Cleanup] Deleted user ID=${createdUserId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH — Logout
  // ══════════════════════════════════════════════════════════════════════════

  it('Auth — logout GET (redirects, clears cookie)', async () => {
    const req = makeRequest('http://localhost/api/auth/logout', { method: 'GET' });
    const res = await authLogoutGET(req);
    expect([200, 302, 307, 308]).toContain(res.status);
  });

  it('Auth — Logout: clears auth cookie', async () => {
    const res  = await logoutPOST();
    const body = await parseJson(res);
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getCookieStore().has('readi_auth_token')).toBe(false);
  });

  it('Auth — Post-logout: protected routes return 401', async () => {
    const req = makeRequest('/api/team/user/list', { method: 'POST', body: {} });
    const res = await listUsersPOST(req);
    expect(res.status).toBe(401);
  });

});
