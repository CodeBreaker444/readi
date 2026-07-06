import { Role, roleHasPermission } from './roles';

export type AccessLevel = 'R' | 'A';

export type FeatureKey =
  | 'dashboard_analytics'
  | 'dashboard_shi_kpi'
  | 'planning_new_evaluation'
  | 'planning_evaluation'
  | 'planning_dashboard'
  | 'planning_mission_templates'
  | 'operation_mission_table'
  | 'operation_daily_board'
  | 'operation_flight_requests'
  | 'operation_calendar'
  | 'logbook_planned_mission'
  | 'logbook_flight'
  | 'logbook_battery'
  | 'safety_spi_kpi_definitions'
  | 'emergency_contact_list'
  | 'compliance_general_audit_plan'
  | 'compliance_safety_target_review'
  | 'compliance_requirements_evidence'
  | 'compliance_calendar'
  | 'control_center_settings'
  | 'control_center_recent_flights'
  | 'drone_atc'
  | 'training_courses'
  | 'training_calendar'
  | 'notifications'
  | 'document_repository'
  | 'audit_logs'
  | 'org_chart'
  | 'org_procedures'
  | 'org_checklist'
  | 'org_assignments'
  | 'org_communication'
  | 'mission_type'
  | 'mission_category'
  | 'mission_status'
  | 'mission_result'
  | 'systems_manage'
  | 'systems_map'
  | 'systems_maintenance_dashboard'
  | 'systems_maintenance_tickets'
  | 'team_personnel'
  | 'team_client'
  | 'settings_security_api_keys'
  | 'settings_integrations';

/** Roles that appear as editable columns in the permission matrix UIs. */
export const MATRIX_ROLES: Role[] = ['AM', 'SM', 'OM', 'MM', 'TM', 'CMM', 'DC', 'VM', 'PIC'];

/** Always full access everywhere, never read from the DB, not editable in either matrix UI. */
export const FULL_ACCESS_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'OPM'];

export interface FeatureSection {
  section: string;
  features: { key: FeatureKey; label: string }[];
}

export const FEATURE_SECTIONS: FeatureSection[] = [
  { section: 'Dashboard', features: [
    { key: 'dashboard_analytics', label: 'Analytics' },
    { key: 'dashboard_shi_kpi', label: 'SHI Index & KPIs' },
  ]},
  { section: 'CO-00 - Planning', features: [
    { key: 'planning_new_evaluation', label: 'P00 - New evaluation request' },
    { key: 'planning_evaluation', label: 'P01 - Evaluation' },
    { key: 'planning_dashboard', label: 'P02 - Planning dashboard' },
    { key: 'planning_mission_templates', label: 'P03 - Mission templates' },
  ]},
  { section: 'Operation', features: [
    { key: 'operation_mission_table', label: 'Mission Table' },
    { key: 'operation_daily_board', label: 'Daily board' },
    { key: 'operation_flight_requests', label: 'Flight Requests' },
    { key: 'operation_calendar', label: 'Calendar' },
  ]},
  { section: 'Logbooks', features: [
    { key: 'logbook_planned_mission', label: 'Planned mission logbook' },
    { key: 'logbook_flight', label: 'Flight logbook' },
    { key: 'logbook_battery', label: 'Battery logbook' },
  ]},
  { section: 'Safety Management', features: [
    { key: 'safety_spi_kpi_definitions', label: 'SPI & KPI Definitions' },
  ]},
  { section: 'Emergency contact list', features: [
    { key: 'emergency_contact_list', label: 'Emergency contact list' },
  ]},
  { section: 'Compliance', features: [
    { key: 'compliance_general_audit_plan', label: 'General audit plan' },
    { key: 'compliance_safety_target_review', label: 'Safety target review' },
    { key: 'compliance_requirements_evidence', label: 'Requirements & evidence' },
    { key: 'compliance_calendar', label: 'Calendar' },
  ]},
  { section: 'Control Center', features: [
    { key: 'control_center_settings', label: 'Settings' },
    { key: 'control_center_recent_flights', label: 'Recent flights' },
  ]},
  { section: 'Drone ATC', features: [
    { key: 'drone_atc', label: 'Drone ATC' },
  ]},
  { section: 'Training', features: [
    { key: 'training_courses', label: 'Courses' },
    { key: 'training_calendar', label: 'Calendar' },
  ]},
  { section: 'Notifications', features: [
    { key: 'notifications', label: 'Notifications' },
  ]},
  { section: 'Document repository', features: [
    { key: 'document_repository', label: 'Document repository' },
  ]},
  { section: 'Audit Logs', features: [
    { key: 'audit_logs', label: 'Audit Logs' },
  ]},
  { section: 'Organization', features: [
    { key: 'org_chart', label: 'Chart' },
    { key: 'org_procedures', label: 'Procedures' },
    { key: 'org_checklist', label: 'Checklist' },
    { key: 'org_assignments', label: 'Assignments' },
    { key: 'org_communication', label: 'Communication' },
  ]},
  { section: 'Mission', features: [
    { key: 'mission_type', label: 'Mission type' },
    { key: 'mission_category', label: 'Mission category' },
    { key: 'mission_status', label: 'Mission status' },
    { key: 'mission_result', label: 'Mission Result' },
  ]},
  { section: 'Systems', features: [
    { key: 'systems_manage', label: 'Manage system' },
    { key: 'systems_map', label: 'Map' },
    { key: 'systems_maintenance_dashboard', label: 'Maintenance dashboard' },
    { key: 'systems_maintenance_tickets', label: 'Maintenance tickets' },
  ]},
  { section: 'Team', features: [
    { key: 'team_personnel', label: 'Personnel' },
    { key: 'team_client', label: 'Client' },
  ]},
  { section: 'Settings', features: [
    { key: 'settings_security_api_keys', label: 'Security & API Keys' },
    { key: 'settings_integrations', label: 'Integrations' },
  ]},
];

export const ALL_FEATURE_KEYS: FeatureKey[] = FEATURE_SECTIONS.flatMap((s) => s.features.map((f) => f.key));

type RoleFeatureMap = Partial<Record<FeatureKey, AccessLevel>>;

/**
 * Transcribed directly from the permission matrix image supplied by the user.
 * A feature key omitted for a role means that role has no access to it at all
 * (same meaning as today's absence from ROLE_PERMISSIONS).
 * Assumption: "Integrations" was cut off in the source image — defaulted to the
 * same values as its sibling row "Security & API Keys".
 */
export const DEFAULT_ROLE_FEATURE_ACCESS: Record<string, RoleFeatureMap> = {
  AM: Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, 'R'])) as RoleFeatureMap,
  SM: {
    dashboard_analytics: 'R', dashboard_shi_kpi: 'R',
    planning_new_evaluation: 'A', planning_evaluation: 'A', planning_dashboard: 'A', planning_mission_templates: 'A',
    operation_mission_table: 'A', operation_daily_board: 'A', operation_flight_requests: 'A', operation_calendar: 'A',
    logbook_planned_mission: 'A', logbook_flight: 'A', logbook_battery: 'A',
    safety_spi_kpi_definitions: 'A',
    emergency_contact_list: 'A',
    compliance_general_audit_plan: 'A', compliance_safety_target_review: 'A', compliance_requirements_evidence: 'A', compliance_calendar: 'A',
    control_center_settings: 'A', control_center_recent_flights: 'A',
    drone_atc: 'R',
    training_courses: 'A', training_calendar: 'A',
    notifications: 'A',
    document_repository: 'A',
    audit_logs: 'A',
    org_chart: 'A', org_procedures: 'A', org_checklist: 'A', org_assignments: 'A', org_communication: 'A',
    mission_type: 'R', mission_category: 'R', mission_status: 'R', mission_result: 'R',
    systems_manage: 'R', systems_map: 'R', systems_maintenance_dashboard: 'R', systems_maintenance_tickets: 'R',
    team_personnel: 'A', team_client: 'A',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
  OM: {
    dashboard_analytics: 'R', dashboard_shi_kpi: 'R',
    planning_new_evaluation: 'A', planning_evaluation: 'A', planning_dashboard: 'A', planning_mission_templates: 'A',
    operation_mission_table: 'A', operation_daily_board: 'R', operation_flight_requests: 'A', operation_calendar: 'A',
    logbook_planned_mission: 'A', logbook_flight: 'A', logbook_battery: 'A',
    emergency_contact_list: 'A',
    control_center_settings: 'A', control_center_recent_flights: 'A',
    drone_atc: 'R',
    notifications: 'A',
    document_repository: 'A',
    audit_logs: 'A',
    org_chart: 'A', org_procedures: 'A', org_checklist: 'A', org_assignments: 'A', org_communication: 'A',
    mission_type: 'A', mission_category: 'A', mission_status: 'A', mission_result: 'A',
    systems_manage: 'R', systems_map: 'R', systems_maintenance_dashboard: 'R', systems_maintenance_tickets: 'R',
    team_personnel: 'R', team_client: 'R',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
  MM: {
    dashboard_analytics: 'R', dashboard_shi_kpi: 'R',
    operation_mission_table: 'R', operation_calendar: 'R',
    logbook_planned_mission: 'R', logbook_flight: 'R', logbook_battery: 'R',
    drone_atc: 'R',
    notifications: 'A',
    document_repository: 'A',
    audit_logs: 'A',
    systems_manage: 'A', systems_map: 'A', systems_maintenance_dashboard: 'A', systems_maintenance_tickets: 'A',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
  TM: {
    dashboard_analytics: 'R', dashboard_shi_kpi: 'R',
    logbook_planned_mission: 'R', logbook_flight: 'R', logbook_battery: 'R',
    drone_atc: 'R',
    training_courses: 'A', training_calendar: 'A',
    notifications: 'A',
    document_repository: 'A',
    audit_logs: 'A',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
  CMM: {
    dashboard_analytics: 'R', dashboard_shi_kpi: 'R',
    planning_new_evaluation: 'R', planning_evaluation: 'R', planning_dashboard: 'R', planning_mission_templates: 'R',
    operation_mission_table: 'R', operation_calendar: 'R',
    logbook_planned_mission: 'R', logbook_flight: 'R', logbook_battery: 'R',
    compliance_general_audit_plan: 'A', compliance_safety_target_review: 'A', compliance_requirements_evidence: 'A', compliance_calendar: 'A',
    drone_atc: 'R',
    notifications: 'A',
    document_repository: 'A',
    audit_logs: 'A',
    systems_manage: 'R', systems_map: 'R', systems_maintenance_dashboard: 'R', systems_maintenance_tickets: 'R',
    team_personnel: 'R', team_client: 'R',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
  DC: {
    dashboard_analytics: 'R', dashboard_shi_kpi: 'R',
    operation_mission_table: 'R',
    logbook_planned_mission: 'R', logbook_flight: 'R', logbook_battery: 'R',
    drone_atc: 'R',
    notifications: 'A',
    document_repository: 'A',
    audit_logs: 'A',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
  VM: {
    dashboard_analytics: 'R', dashboard_shi_kpi: 'R',
    logbook_flight: 'R', logbook_battery: 'R',
    drone_atc: 'R',
    notifications: 'A',
    document_repository: 'A',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
  PIC: {
    dashboard_analytics: 'R',
    planning_dashboard: 'A', planning_mission_templates: 'A',
    operation_mission_table: 'A', operation_daily_board: 'A', operation_calendar: 'R',
    logbook_planned_mission: 'R', logbook_flight: 'R', logbook_battery: 'R',
    drone_atc: 'R',
    notifications: 'A',
    systems_maintenance_dashboard: 'R', systems_maintenance_tickets: 'A',
    settings_security_api_keys: 'A', settings_integrations: 'A',
  },
};

function isFullAccessRole(role: Role | null | undefined): boolean {
  return !!role && FULL_ACCESS_ROLES.includes(role);
}

/** Maps a feature key to the closest legacy view_* permission, for roles outside the matrix. */
function featureToLegacyPermission(featureKey: FeatureKey) {
  if (featureKey.startsWith('planning_')) return 'view_planning_advanced' as const;
  if (featureKey.startsWith('operation_')) return 'view_operations_full' as const;
  if (featureKey.startsWith('logbook_')) return 'view_logbooks' as const;
  if (featureKey.startsWith('compliance_')) return 'view_compliance' as const;
  if (featureKey.startsWith('org_') || featureKey.startsWith('mission_') || featureKey.startsWith('systems_') || featureKey.startsWith('settings_')) return 'view_config' as const;
  if (featureKey.startsWith('training_')) return 'view_training' as const;
  if (featureKey === 'drone_atc') return 'view_drone_atc' as const;
  if (featureKey === 'document_repository') return 'view_repository' as const;
  if (featureKey === 'audit_logs') return 'view_logs' as const;
  if (featureKey === 'notifications') return 'view_notifications' as const;
  if (featureKey === 'team_personnel' || featureKey === 'team_client') return 'manage_users' as const;
  return 'view_dashboard' as const;
}

export function canEditFeature(access: AccessLevel | null | undefined): boolean {
  return access === 'A';
}

export function canDeleteFeature(access: AccessLevel | null | undefined, isManager: boolean | undefined): boolean {
  return access === 'A' && isManager === true;
}
