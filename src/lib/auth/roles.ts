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
  | 'CLIENT';

export type Permission =
  | 'view_dashboard'
  | 'view_pilot_dashboard'
  | 'view_operations'
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
  | 'view_client_portal';

type WildcardPermission = '*';
export type RolePermission = Permission | WildcardPermission;

export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
  SUPERADMIN: ['*'],
  ADMIN: [
    'view_dashboard', 'view_pilot_dashboard', 'view_operations', 'view_compliance',
    'view_training', 'view_safety_mgmt', 'view_config', 'view_repository', 'view_logs',
    'view_planning', 'view_planning_advanced', 'view_logbooks', 'view_notifications',
    'manage_users', 'view_client', 'add_company', 'view_erp', 'view_drone_atc'
  ],
  PIC: [
    'view_pilot_dashboard',
    'view_planning',
    'view_operations',
    'view_notifications',
    'view_repository',
    'view_drone_atc',
  ],
  OPM: ['view_dashboard', 'view_operations', 'view_logs', 'view_repository', 'view_planning', 'view_planning_advanced', 'view_logbooks', 'view_safety_mgmt', 'view_config', 'view_notifications', 'view_client', 'manage_users', 'view_erp', 'view_drone_atc'],
  SM:  ['view_dashboard', 'view_safety_mgmt', 'view_repository', 'view_notifications', 'view_config', 'view_erp'],
  AM:  ['view_dashboard', 'view_logs', 'view_repository', 'view_logbooks', 'view_config', 'view_notifications', 'manage_users', 'view_erp'],
  CMM: ['view_dashboard', 'view_compliance', 'view_repository', 'view_notifications', 'view_erp'],
  RM:  ['view_operations', 'view_logs', 'view_logbooks', 'view_notifications', 'view_erp'],
  TM:  ['view_dashboard', 'view_training', 'view_repository', 'view_notifications', 'view_erp'],
  DC:  ['view_repository', 'view_config', 'view_notifications', 'view_erp'],
  SLA: ['view_dashboard', 'view_logs', 'view_config', 'view_notifications', 'view_erp'],
  CLIENT: ['view_client_portal'],
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
  '/planning/flight-requests': 'view_planning_advanced',
  '/settings/security': 'view_config',
  '/missions/table': 'view_operations',
  '/missions/daily-board': 'view_operations',
  '/missions/calendar': 'view_operations',
  '/missions/flight-requests': 'view_operations',
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
  '/systems/maintenance-dashboard': 'view_config',
  '/systems/maintenance-tickets': 'view_config',
  '/team/personnel': 'manage_users',
  '/team/crew-shift': 'manage_users',
  '/team/client': 'view_client',
  '/client/dashboard': 'view_client_portal',
  '/client/missions': 'view_client_portal',
  '/client/request-flight': 'view_client_portal',
  '/client/analytics': 'view_client_portal',
  '/client/profile': 'view_client_portal',
  '/company': 'add_company',
  '/audit-logs': 'view_logs',
  '/training/courses': 'view_training',
  '/training/calendar': 'view_training',
  '/drone-atc': 'view_drone_atc',
};

export type ApiPermissionEntry = Permission | Permission[] | null;

export const API_ROUTE_PERMISSIONS: Array<{ prefix: string; permission: ApiPermissionEntry }> = [
  { prefix: '/api/profile', permission: null },
  { prefix: '/api/dashboard', permission: ['view_dashboard', 'view_pilot_dashboard'] },
  { prefix: '/api/evaluation/new-req', permission: 'view_planning_advanced' },
  { prefix: '/api/evaluation/planning', permission: 'view_planning' },
  { prefix: '/api/planning/flight-requests', permission: 'view_planning_advanced' },
  { prefix: '/api/planning', permission: 'view_planning' },
  { prefix: '/api/settings', permission: 'view_config' },
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
  if (role === 'SUPERADMIN' || role === 'ADMIN') return true;

  if (role === 'CLIENT') {
    return pathname.startsWith('/client/');
  }

  const required = ROUTE_PERMISSIONS[pathname];
  if (required === undefined) return true;

  const perms: Permission[] = Array.isArray(required) ? required : [required];
  return perms.some((p) => roleHasPermission(role, p));
}

export function getAccessibleRoutes(role: Role | null | undefined): string[] {
  if (!role) return [];
  if (role === 'SUPERADMIN' || role === 'ADMIN') return Object.keys(ROUTE_PERMISSIONS);

  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([_, entry]) => {
      const perms: Permission[] = Array.isArray(entry) ? entry : [entry];
      return perms.some((p) => roleHasPermission(role, p));
    })
    .map(([route]) => route);
}

export function getDefaultRoute(role: Role | null | undefined): string {
  if (!role) return '/auth/login';

  if (role === 'CLIENT') return '/client/dashboard';
  if (roleHasPermission(role, 'view_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_pilot_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_operations')) return '/missions/table';
  if (roleHasPermission(role, 'view_repository')) return '/document-repository';

  return '/auth/login';
}