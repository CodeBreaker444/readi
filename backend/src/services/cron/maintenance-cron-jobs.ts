/**
 * Cron jobs: maintenance.
 *   - check-maintenance-alerts      -> runMaintenanceAlertsJob
 *   - refresh-maintenance-days      -> runRefreshMaintenanceDaysJob
 * Each returns the exact JSON body its route responds with.
 */
import { triggerMaintenanceAlertCheck } from '@/backend/services/system/maintenance-notification';
import { refreshMaintenanceDaysForOwner } from '@/backend/utils/refresh-maintenance-days';
import { getActiveOwnerIds, runForEachOwner } from './cron-utils';

export async function runMaintenanceAlertsJob() {
  const ownerIds = await getActiveOwnerIds();

  if (ownerIds.length === 0) {
    return { message: 'No active owners found', processed: 0 };
  }

  const { processed, errors } = await runForEachOwner(
    ownerIds,
    'check maintenance alerts',
    triggerMaintenanceAlertCheck
  );

  return {
    message: 'Maintenance alerts check completed',
    processed,
    errors,
    total: ownerIds.length,
  };
}

export async function runRefreshMaintenanceDaysJob() {
  const ownerIds = await getActiveOwnerIds();

  if (ownerIds.length === 0) {
    return { message: 'No active owners found', processed: 0 };
  }

  const { processed, errors } = await runForEachOwner(
    ownerIds,
    'refresh maintenance days',
    refreshMaintenanceDaysForOwner
  );

  return {
    message: 'Maintenance days refresh completed',
    processed,
    errors,
    total: ownerIds.length,
  };
}
