import type { FeatureKey } from './feature-permissions-types';
import { MATRIX_ROLES, DEFAULT_ROLE_FEATURE_ACCESS, FULL_ACCESS_ROLES, featureToLegacyPermission } from './feature-permissions-types';

export type Role =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'PIC'
  | 'OPM'
  | 'SM'
  | 'AM'
  | 'CMM'
  | 'RM'
  | 'TM'
  | 'DC'
  | 'SLA'
  | 'CLIENT'
  | 'OM'
  | 'MM'
  | 'VM';

export type SubRole = 'PIC_TECHNICIAN';

export const SUBROLES: Record<SubRole, SubRole> = {
  PIC_TECHNICIAN: 'PIC_TECHNICIAN',
};

export const SUBROLE_PARENT_ROLE: Record<SubRole, Role> = {
  PIC_TECHNICIAN: 'PIC',
};

export type Permission =
  | 'view_dashboard'
  | 'view_pilot_dashboard'
  | 'view_operations'
  | 'view_operations_full'
  | 'view_compliance'
  | 'view_training'
  | 'view_safety_mgmt'
  | 'view_config'
  | 'view_repository'
  | 'view_logs'
  | 'view_planning'
  | 'view_planning_advanced'
  | 'view_logbooks'
  | 'view_notifications'
  | 'manage_users'
  | 'add_company'
  | 'view_client'
  | 'view_erp'
  | 'view_drone_atc'
  | 'view_client_portal'
  | 'view_maintenance_tickets';

type WildcardPermission = '*';
export type RolePermission = Permission | WildcardPermission;

export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
  SUPERADMIN: ['*'],
  ADMIN: [
    'view_dashboard', 'view_pilot_dashboard', 'view_operations', 'view_operations_full', 'view_compliance',
    'view_training', 'view_safety_mgmt', 'view_config', 'view_repository', 'view_logs',
    'view_planning', 'view_planning_advanced', 'view_logbooks', 'view_notifications',
    'manage_users', 'view_client', 'view_erp', 'view_drone_atc'
  ],
  PIC: [
    'view_pilot_dashboard',
    'view_planning',
    'view_operations',
    'view_operations_full',
    'view_notifications',
    'view_drone_atc',
    'view_maintenance_tickets',
    'view_logbooks',
    'view_erp',
  ],
  OPM: ['view_dashboard', 'view_operations', 'view_operations_full', 'view_logs', 'view_repository', 'view_planning', 'view_planning_advanced', 'view_logbooks', 'view_safety_mgmt', 'view_config', 'view_notifications', 'view_client', 'manage_users', 'view_erp', 'view_drone_atc'],
  SM:  ['view_dashboard', 'view_planning', 'view_planning_advanced', 'view_safety_mgmt', 'view_repository', 'view_notifications', 'view_config', 'view_erp',
    'view_operations', 'view_logbooks', 'view_compliance', 'view_drone_atc', 'view_training', 'view_logs', 'manage_users', 'view_client'],
  AM:  ['view_dashboard', 'view_planning', 'view_planning_advanced', 'view_operations_full', 'view_safety_mgmt', 'view_logs', 'view_repository', 'view_logbooks', 'view_compliance','view_config', 'view_notifications', 'manage_users', 'view_erp',  'view_drone_atc', 'view_training',
    'view_operations', 'view_client'],
  CMM: ['view_dashboard', 'view_compliance', 'view_repository', 'view_notifications', 'view_erp',
    'view_planning_advanced', 'view_planning', 'view_operations', 'view_logbooks', 'view_drone_atc', 'view_config', 'view_logs', 'manage_users', 'view_client'],
  RM:  ['view_operations', 'view_operations_full', 'view_logs', 'view_logbooks', 'view_notifications', 'view_erp', 'view_config', 'view_drone_atc'],
  TM:  ['view_dashboard', 'view_training', 'view_repository', 'view_notifications', 'view_erp',
    'view_logbooks', 'view_drone_atc', 'view_logs', 'view_operations'],
  DC:  ['view_repository', 'view_config', 'view_notifications', 'view_erp',
    'view_dashboard', 'view_operations', 'view_planning', 'view_logbooks', 'view_drone_atc', 'view_logs'],
  SLA: ['view_dashboard', 'view_logs', 'view_config', 'view_notifications', 'view_erp'],
  CLIENT: ['view_client_portal'],
  OM: ['view_dashboard', 'view_planning', 'view_planning_advanced', 'view_operations', 'view_logbooks', 'view_erp', 'view_drone_atc', 'view_notifications', 'view_repository', 'view_logs', 'view_config', 'manage_users',
    'view_client'],
  MM: ['view_dashboard', 'view_operations', 'view_logbooks', 'view_drone_atc', 'view_notifications', 'view_repository', 'view_logs', 'view_config',
    'view_erp', 'view_planning'],
  VM: ['view_dashboard', 'view_drone_atc', 'view_notifications', 'view_repository', 'view_logs',
    'view_logbooks'],
};

export function roleHasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*' as Permission)) return true;
  return perms.includes(permission);
}

export type RoutePermissionEntry = Permission | Permission[];

export const ROUTE_PERMISSIONS: Record<string, RoutePermissionEntry> = {
  '/dashboard': ['view_dashboard', 'view_pilot_dashboard'],
  '/dashboard/safety-health': 'view_dashboard',
  '/planning/new-evaluation': 'view_planning_advanced',
  '/planning/evaluation': 'view_planning_advanced',
  '/planning/planning-mission': 'view_planning',
  '/planning/planning-dashboard': 'view_planning',
  '/planning/mission-template': 'view_planning',
  '/operations/table': 'view_operations',
  '/operations/daily-board': 'view_operations_full',
  '/operations/calendar': 'view_operations',
  '/operations/flight-requests': 'view_operations_full',
  '/logbooks/mission-planning-logbook': 'view_logbooks',
  '/logbooks/operation-logbook': 'view_logbooks',
  '/logbooks/battery-logbook': 'view_logbooks',
  '/safety/spi-kpi-definitions': 'view_safety_mgmt',
  '/emergency-contact': 'view_erp',
  '/compliance/general-audit-plan': 'view_compliance',
  '/compliance/safety-target-review': 'view_compliance',
  '/compliance/requirements-evidences': 'view_compliance',
  '/compliance/calendar': 'view_compliance',
  '/notifications': 'view_notifications',
  '/document-repository': 'view_repository',
  '/organization/chart': 'view_config',
  '/organization/luc-procedures': 'view_config',
  '/organization/checklist': 'view_config',
  '/organization/assignments': 'view_config',
  '/organization/communication': 'view_config',
  '/mission/type': 'view_config',
  '/mission/category': 'view_config',
  '/mission/status': 'view_config',
  '/mission/result': 'view_config',
  '/systems/manage': 'view_config',
  '/systems/map': 'view_config',
  '/systems/maintenance-dashboard': ['view_config', 'view_maintenance_tickets'],
  '/systems/maintenance-tickets': ['view_config', 'view_maintenance_tickets'],
  '/team/personnel': 'manage_users',
  '/team/crew-shift': 'manage_users',
  '/team/client': 'view_client',
  '/client/dashboard': 'view_client_portal',
  '/client/missions': 'view_client_portal',
  '/client/request-flight': 'view_client_portal',
  '/client/analytics': 'view_client_portal',
  '/client/profile': 'view_client_portal',
  '/company': 'add_company',
  '/company/new': 'add_company',
  '/audit-logs': 'view_logs',
  '/training/courses': 'view_training',
  '/training/calendar': 'view_training',
  '/drone-atc': 'view_drone_atc',
};

/**
 * Maps a page route to the feature key that governs it in the per-role access
 * matrix (see feature-permissions-types.ts). Routes listed here are checked
 * against DEFAULT_ROLE_FEATURE_ACCESS for the 9 matrix roles instead of the
 * coarser ROLE_PERMISSIONS grants below.
 */
export const ROUTE_FEATURE_KEYS: Partial<Record<string, FeatureKey>> = {
  '/dashboard': 'dashboard_analytics',
  '/dashboard/safety-health': 'dashboard_shi_kpi',
  '/planning/new-evaluation': 'planning_new_evaluation',
  '/planning/evaluation': 'planning_evaluation',
  '/planning/planning-dashboard': 'planning_dashboard',
  '/planning/mission-template': 'planning_mission_templates',
  '/operations/table': 'operation_mission_table',
  '/operations/daily-board': 'operation_daily_board',
  '/operations/flight-requests': 'operation_flight_requests',
  '/operations/calendar': 'operation_calendar',
  '/logbooks/mission-planning-logbook': 'logbook_planned_mission',
  '/logbooks/operation-logbook': 'logbook_flight',
  '/logbooks/battery-logbook': 'logbook_battery',
  '/safety/spi-kpi-definitions': 'safety_spi_kpi_definitions',
  '/emergency-contact': 'emergency_contact_list',
  '/compliance/general-audit-plan': 'compliance_general_audit_plan',
  '/compliance/safety-target-review': 'compliance_safety_target_review',
  '/compliance/requirements-evidences': 'compliance_requirements_evidence',
  '/compliance/calendar': 'compliance_calendar',
  '/control-center/c2-config': 'control_center_settings',
  '/control-center/flights': 'control_center_recent_flights',
  '/drone-atc': 'drone_atc',
  '/training/courses': 'training_courses',
  '/training/calendar': 'training_calendar',
  '/notifications': 'notifications',
  '/document-repository': 'document_repository',
  '/audit-logs': 'audit_logs',
  '/organization/chart': 'org_chart',
  '/organization/luc-procedures': 'org_procedures',
  '/organization/checklist': 'org_checklist',
  '/organization/assignments': 'org_assignments',
  '/organization/communication': 'org_communication',
  '/mission/type': 'mission_type',
  '/mission/category': 'mission_category',
  '/mission/status': 'mission_status',
  '/mission/result': 'mission_result',
  '/systems/manage': 'systems_manage',
  '/systems/map': 'systems_map',
  '/systems/maintenance-dashboard': 'systems_maintenance_dashboard',
  '/systems/maintenance-tickets': 'systems_maintenance_tickets',
  '/team/personnel': 'team_personnel',
  '/team/client': 'team_client',
  '/settings/security': 'settings_security_api_keys',
  '/settings/integrations': 'settings_integrations',
};

/**
 * Resolves whether `role` can view a feature-gated page: full-access roles always
 * can, the 9 matrix roles are checked against DEFAULT_ROLE_FEATURE_ACCESS (any
 * non-blank cell — 'R' or 'A' — means view access), and roles outside the matrix
 * (RM, SLA) fall back to their closest legacy view_* permission.
 */
function hasFeatureAccess(role: Role, featureKey: FeatureKey): boolean {
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  if (MATRIX_ROLES.includes(role)) {
    return DEFAULT_ROLE_FEATURE_ACCESS[role]?.[featureKey] !== undefined;
  }
  return roleHasPermission(role, featureToLegacyPermission(featureKey));
}

export type ApiPermissionEntry = Permission | Permission[] | null;

export const API_ROUTE_PERMISSIONS: Array<{ prefix: string; permission: ApiPermissionEntry }> = [
  { prefix: '/api/profile', permission: null },
  { prefix: '/api/dashboard', permission: ['view_dashboard', 'view_pilot_dashboard'] },
  { prefix: '/api/evaluation/new-req', permission: 'view_planning_advanced' },
  { prefix: '/api/evaluation/planning', permission: 'view_planning' },
  { prefix: '/api/planning/flight-requests', permission: 'view_planning_advanced' },
  { prefix: '/api/planning', permission: 'view_planning' },
  { prefix: '/api/settings', permission: null },
  { prefix: '/api/evaluation/mission-template', permission: 'view_planning' },
  { prefix: '/api/evaluation/mission', permission: 'view_planning' },
  { prefix: '/api/evaluation/luc-procedures', permission: 'view_planning' },
  { prefix: '/api/evaluation', permission: 'view_planning_advanced' },
  { prefix: '/api/operation', permission: 'view_operations' },
  { prefix: '/api/logbooks', permission: 'view_logbooks' },
  { prefix: '/api/erp', permission: 'view_erp' },
  { prefix: '/api/safety', permission: 'view_safety_mgmt' },
  { prefix: '/api/compliance', permission: 'view_compliance' },
  { prefix: '/api/notification', permission: 'view_notifications' },
  { prefix: '/api/document', permission: 'view_repository' },
  { prefix: '/api/luc-procedures', permission: ['view_config', 'view_planning'] },
  { prefix: '/api/organization', permission: 'view_config' },
  { prefix: '/api/mission', permission: 'view_config' },
  { prefix: '/api/system/maintenance/tickets', permission: ['view_config', 'view_maintenance_tickets'] },
  { prefix: '/api/system/maintenance/dashboard', permission: ['view_config', 'view_maintenance_tickets'] },
  { prefix: '/api/system/maintenance/lookups', permission: ['view_config', 'view_maintenance_tickets'] },
  { prefix: '/api/system/component/list', permission: ['view_config', 'view_operations'] },
  { prefix: '/api/system', permission: 'view_config' },
  { prefix: '/api/team/shift', permission: 'manage_users' },
  { prefix: '/api/team/user/qualifications', permission: null },
  { prefix: '/api/team/user/list', permission: ['manage_users', 'view_logs'] },
  { prefix: '/api/team/user', permission: 'manage_users' },
  { prefix: '/api/client/list', permission: ['view_client', 'view_config', 'view_planning'] },
  { prefix: '/api/client', permission: 'view_client' },
  { prefix: '/api/client-portal', permission: 'view_client_portal' },
  { prefix: '/api/audit-logs', permission: 'view_logs' },
  { prefix: '/api/training', permission: 'view_training' },
  { prefix: '/api/integrations/flytbase', permission: null },
  { prefix: '/api/drone-atc/user-info', permission: null },
  { prefix: '/api/drone-atc/users', permission: null },
  { prefix: '/api/drone-atc', permission: 'view_drone_atc' },
];

export function getApiRoutePermission(pathname: string): ApiPermissionEntry | undefined {
  for (const entry of API_ROUTE_PERMISSIONS) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + '/')) {
      return entry.permission;
    }
  }
  return undefined; 
}

export function canAccessRoute(role: Role | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === 'SUPERADMIN') return true;

  if (role === 'CLIENT') {
    return pathname.startsWith('/client/');
  }

  const featureKey = ROUTE_FEATURE_KEYS[pathname];
  if (featureKey) return hasFeatureAccess(role, featureKey);

  const required = ROUTE_PERMISSIONS[pathname];
  if (required === undefined) return true;

  const perms: Permission[] = Array.isArray(required) ? required : [required];
  return perms.some((p) => roleHasPermission(role, p));
}

export function getAccessibleRoutes(role: Role | null | undefined): string[] {
  if (!role) return [];
  const allRoutes = Array.from(new Set([...Object.keys(ROUTE_PERMISSIONS), ...Object.keys(ROUTE_FEATURE_KEYS)]));
  if (role === 'SUPERADMIN' || role === 'ADMIN') return allRoutes;

  return allRoutes.filter((route) => canAccessRoute(role, route));
}

export function getDefaultRoute(role: Role | null | undefined): string {
  if (!role) return '/auth/login';

  if (role === 'CLIENT') return '/client/dashboard';
  if (roleHasPermission(role, 'view_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_pilot_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_operations')) return '/operations/table';
  if (roleHasPermission(role, 'view_repository')) return '/document-repository';

  return '/auth/login';
}
