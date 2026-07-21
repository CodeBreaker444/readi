export interface ModuleEmailNotificationConfig {
  config_id: number;
  fk_owner_id: number;
  module_name: string;
  event_type: string;
  is_enabled: boolean;
  notification_roles: string[];
  notification_user_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface ModuleEmailNotificationUpdate {
  ownerId: number;
  moduleName: string;
  eventType: string;
  isEnabled: boolean;
  notificationRoles: string[];
  notificationUserIds: number[];
}

export type MaintenanceEventType = 
  | 'ticket_created'
  | 'ticket_closed'
  | 'ticket_assigned'
  | 'maintenance_alert'
  | 'maintenance_due'
  | 'intervention_started'
  | 'intervention_ended';

export type OperationsEventType =
  | 'mission_created'
  | 'mission_started'
  | 'mission_completed'
  | 'calendar_event_created'
  | 'calendar_event_updated';

export interface MaintenanceEventConfig {
  eventType: MaintenanceEventType;
  displayName: string;
  description: string;
  defaultRoles: string[];
}

export interface OperationsEventConfig {
  eventType: OperationsEventType;
  displayName: string;
  description: string;
  defaultRoles: string[];
}

export const MAINTENANCE_EVENTS: MaintenanceEventConfig[] = [
  {
    eventType: 'ticket_created',
    displayName: 'Ticket Created',
    description: 'When a new maintenance ticket is created',
    defaultRoles: ['OPM', 'ADMIN'],
  },
  {
    eventType: 'ticket_closed',
    displayName: 'Ticket Closed',
    description: 'When a maintenance ticket is closed',
    defaultRoles: ['OPM', 'ADMIN'],
  },
  {
    eventType: 'ticket_assigned',
    displayName: 'Ticket Assigned',
    description: 'When a maintenance ticket is assigned to a technician',
    defaultRoles: ['OPM', 'ADMIN', 'TECHNICIAN'],
  },
  {
    eventType: 'maintenance_alert',
    displayName: 'Maintenance Alert',
    description: 'When a component approaches its maintenance limit',
    defaultRoles: ['OPM', 'ADMIN', 'RM'],
  },
  {
    eventType: 'maintenance_due',
    displayName: 'Maintenance Due',
    description: 'When a component reaches its maintenance limit',
    defaultRoles: ['OPM', 'ADMIN', 'RM'],
  },
  {
    eventType: 'intervention_started',
    displayName: 'Intervention Started',
    description: 'When maintenance intervention begins',
    defaultRoles: ['OPM', 'ADMIN'],
  },
  {
    eventType: 'intervention_ended',
    displayName: 'Intervention Ended',
    description: 'When maintenance intervention ends',
    defaultRoles: ['OPM', 'ADMIN'],
  },
];

export const OPERATIONS_EVENTS: OperationsEventConfig[] = [
  {
    eventType: 'mission_created',
    displayName: 'Mission Created',
    description: 'When a new mission is created',
    defaultRoles: ['OPM', 'ADMIN', 'PILOT'],
  },
  {
    eventType: 'mission_started',
    displayName: 'Mission Started',
    description: 'When a mission begins',
    defaultRoles: ['OPM', 'ADMIN', 'PILOT'],
  },
  {
    eventType: 'mission_completed',
    displayName: 'Mission Completed',
    description: 'When a mission is completed',
    defaultRoles: ['OPM', 'ADMIN', 'PILOT'],
  },
  {
    eventType: 'calendar_event_created',
    displayName: 'Calendar Event Created',
    description: 'When a new calendar event is created',
    defaultRoles: ['OPM', 'ADMIN'],
  },
  {
    eventType: 'calendar_event_updated',
    displayName: 'Calendar Event Updated',
    description: 'When a calendar event is updated',
    defaultRoles: ['OPM', 'ADMIN'],
  },
];

export const AVAILABLE_ROLES = ['ADMIN', 'PIC', 'OPM', 'SM', 'AM', 'CMM', 'RM', 'TM', 'DC', 'SLA', 'OM', 'MM', 'VM'];
