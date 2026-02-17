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
  | 'view_logbooks'
  | 'view_notifications'
  | 'manage_users'
  | 'add_company';  

type WildcardPermission = '*';
export type RolePermission = Permission | WildcardPermission;

export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
  SUPERADMIN: ['*'], 
  ADMIN: ['view_dashboard','view_pilot_dashboard','view_operations','view_compliance','view_training','view_safety_mgmt','view_config','view_repository','view_logs','view_planning','view_logbooks','view_notifications','manage_users'],
  PIC: ['view_pilot_dashboard', 'view_operations', 'view_repository', 'view_logbooks'],
  OPM: ['view_dashboard', 'view_operations', 'view_logs', 'view_repository', 'view_planning', 'view_logbooks'],
  SM: ['view_dashboard', 'view_safety_mgmt', 'view_repository', 'view_notifications'],
  AM: ['view_dashboard', 'view_logs', 'view_repository', 'view_logbooks'],
  CMM: ['view_dashboard', 'view_compliance', 'view_repository', 'view_logbooks'],
  RM: ['view_operations', 'view_logs'],
  TM: ['view_dashboard', 'view_training', 'view_repository'],
  DC: ['view_repository'],
  SLA: ['view_dashboard', 'view_logs'],
  CLIENT: ['view_dashboard', 'view_repository'],
};
export function roleHasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*' as Permission)) return true;
  return perms.includes(permission);
}

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'view_dashboard',
  '/dashboard/safety-health': 'view_dashboard',
  '/planning/new-evaluation': 'view_planning',
  '/planning/evaluation': 'view_planning',
  '/planning/planning-mission': 'view_planning',
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
  '/team/crew-shift': 'view_config',
  '/company': 'add_company',
};

export function canAccessRoute(role: Role | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true;
  
  const requiredPermission = ROUTE_PERMISSIONS[pathname];
  if (!requiredPermission) return false;
  
  return roleHasPermission(role, requiredPermission);
}

export function getAccessibleRoutes(role: Role | null | undefined): string[] {
  if (!role) return [];
  if (role === 'ADMIN') return Object.keys(ROUTE_PERMISSIONS);
  
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([_, permission]) => roleHasPermission(role, permission))
    .map(([route, _]) => route);
}

export function getDefaultRoute(role: Role | null | undefined): string {
  if (!role) return '/auth/login';
  
  if (roleHasPermission(role, 'view_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_pilot_dashboard')) return '/dashboard';
  if (roleHasPermission(role, 'view_operations')) return '/operations/table';
  if (roleHasPermission(role, 'view_repository')) return '/document-repository';
  
  return '/auth/login';
}