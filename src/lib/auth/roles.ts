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
  | 'SLA';

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
  | 'view_client';

type WildcardPermission = '*';
export type RolePermission = Permission | WildcardPermission;

export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
  SUPERADMIN: ['*'],
  ADMIN: [
    'view_dashboard', 'view_pilot_dashboard', 'view_operations', 'view_compliance',
    'view_training', 'view_safety_mgmt', 'view_config', 'view_repository', 'view_logs',
    'view_planning', 'view_planning_advanced', 'view_logbooks', 'view_notifications',
    'manage_users', 'view_client', 'add_company'
  ],
  PIC: [
    'view_pilot_dashboard',
    'view_planning',
    'view_operations',
    'view_notifications',
    'view_repository',
  ],
  OPM: ['view_dashboard', 'view_operations', 'view_logs', 'view_repository', 'view_planning', 'view_planning_advanced', 'view_logbooks', 'view_config', 'view_notifications', 'view_client'],
  SM:  ['view_dashboard', 'view_safety_mgmt', 'view_repository', 'view_notifications','view_config'],
  AM:  ['view_dashboard', 'view_logs', 'view_repository', 'view_logbooks','view_config','view_notifications'],
  CMM: ['view_dashboard', 'view_compliance', 'view_repository', 'view_logbooks', 'view_notifications'],
  RM:  ['view_operations', 'view_logs','view_logbooks','view_notifications'],
  TM:  ['view_dashboard', 'view_training', 'view_repository','view_notifications'],
  DC:  ['view_repository','view_config','view_notifications'],
  SLA: ['view_dashboard', 'view_logs','view_config','view_notifications'],
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
  '/dashboard/safety-health': ['view_dashboard', 'view_pilot_dashboard'],
  '/planning/new-evaluation': 'view_planning_advanced',
  '/planning/evaluation': 'view_planning_advanced',
  '/planning/planning-mission': 'view_planning',
  '/planning/planning-dashboard': 'view_planning',
  '/planning/mission-template': 'view_planning',
  '/operations/table': 'view_operations',
  '/operations/daily-board': 'view_operations',
  '/operations/calendar': 'view_operations',
  '/logbooks/mission-planning-logbook': 'view_logbooks',
  '/logbooks/operation-logbook': 'view_logbooks',
  '/safety/spi-kpi-definitions': 'view_safety_mgmt',
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
  '/company': 'add_company',
  '/audit-logs': 'view_logs',
};


export type ApiPermissionEntry = Permission | Permission[] | null;

export const API_ROUTE_PERMISSIONS: Array<{ prefix: string; permission: ApiPermissionEntry }> = [
  { prefix: '/api/profile', permission: null },
  { prefix: '/api/dashboard', permission: 'view_dashboard' },
  { prefix: '/api/evaluation/new-req', permission: 'view_planning_advanced' },
  { prefix: '/api/evaluation/planning', permission: 'view_planning' },
  { prefix: '/api/evaluation/mission-template', permission: 'view_planning' },
  { prefix: '/api/evaluation/mission', permission: 'view_planning' },
  { prefix: '/api/evaluation/luc-procedures', permission: 'view_planning' },
  { prefix: '/api/evaluation', permission: 'view_planning_advanced' },
  { prefix: '/api/operation', permission: 'view_operations' },
  { prefix: '/api/logbooks', permission: 'view_logbooks' },
  { prefix: '/api/safety', permission: 'view_safety_mgmt' },
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
  { prefix: '/api/audit-logs', permission: 'view_logs' },
  { prefix: '/api/integrations/flytbase', permission: null },  
];

export function getApiRoutePermission(pathname: string): ApiPermissionEntry | undefined {
  for (const entry of API_ROUTE_PERMISSIONS) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + '/')) {
      return entry.permission;
    }
  }
  return undefined; // not in map = public
}

export function canAccessRoute(role: Role | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === 'SUPERADMIN' || role === 'ADMIN') return true;

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

  if (roleHasPermission(role, 'view_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_pilot_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_operations')) return '/operations/table';
  if (roleHasPermission(role, 'view_repository')) return '/document-repository';

  return '/auth/login';
}
