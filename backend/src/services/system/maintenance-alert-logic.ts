/**
 * Maintenance alert rules (PURE - no database, no email).
 *
 *  - which dashboard components deserve an alert         
 *  - which of those were not already notified today      
 *  - the notification title / message text                
 *
 * Delivery (in-app notifications + emails) lives in maintenance-notification.ts.
 */
import type { MaintenanceDrone } from '@/config/types/maintenance';

export interface AlertItem {
  tool_component_id: number;
  component_name: string;
  system_code: string;
  status: 'ALERT' | 'DUE';
  triggers: string[];
  drone_id: number;
}

/** Roles that receive in-app maintenance alerts. */
export const MAINTENANCE_ALERT_ROLES = ['OPM', 'RM', 'ADMIN'];

/** Threshold (percent) passed to the dashboard when the cron evaluates alerts. */
export const MAINTENANCE_ALERT_THRESHOLD_PERCENT = 80;

export function collectAlertItems(drones: MaintenanceDrone[]): AlertItem[] {
  const items: AlertItem[] = [];
  for (const drone of drones) {
    for (const comp of drone.components) {
      if (comp.status === 'ALERT' || comp.status === 'DUE') {
        items.push({
          tool_component_id: comp.tool_component_id,
          component_name: comp.component_name,
          system_code: drone.code,
          status: comp.status,
          triggers: comp.trigger.filter((t): t is string => !!t),
          drone_id: drone.tool_id,
        });
      }
    }
  }
  return items;
}

export const alertKey = (componentId: number, status: string): string => `${componentId}:${status}`;

/**
 * One alert per component PER STATUS per day: ALERT in the morning and DUE in the afternoon
 * are two different alerts, but a repeated ALERT (or DUE) is not re-sent.
 */
export function filterNotYetNotified(items: AlertItem[], alreadyNotified: Set<string>): AlertItem[] {
  return items.filter((item) => !alreadyNotified.has(alertKey(item.tool_component_id, item.status)));
}

/** "<component_id>:<status>" keys found in the notification_data of today's MAINTENANCE notifications. */
export function extractNotifiedAlertKeys(rows: { notification_data: unknown }[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    const data = row.notification_data as { component_id?: unknown; status?: unknown } | null;
    if (typeof data?.component_id === 'number' && typeof data?.status === 'string') {
      keys.add(alertKey(data.component_id, data.status));
    }
  }
  return keys;
}

export function buildAlertContent(item: AlertItem): { title: string; message: string; isDue: boolean } {
  const isDue = item.status === 'DUE';
  const triggerStr = item.triggers.length
    ? item.triggers.map((t) => t.toLowerCase()).join(', ')
    : 'maintenance limit';

  const title = isDue
    ? `Maintenance Required — ${item.system_code}`
    : `Maintenance Alert — ${item.system_code}`;

  const message = isDue
    ? `Component "${item.component_name}" on system ${item.system_code} has reached its maintenance limit (${triggerStr}). Immediate maintenance required.`
    : `Component "${item.component_name}" on system ${item.system_code} is approaching its maintenance limit (${triggerStr}).`;

  return { title, message, isDue };
}
