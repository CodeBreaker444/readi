/**
 * Cron jobs: expirations.
 *   - check-component-expiration    
 *   - check-insurance-expiration  
 *   - check-training-expiration      
 * Each returns the exact JSON body its route responds with.
 */
import { prisma } from '@/lib/prisma';
import { sendExpirationNotifications } from '@/backend/services/system/expiration-notification';
import {
  findExpiringInsurancesForOwner,
  sendInsuranceExpiryNotifications,
} from '@/backend/services/system/dflight-insurance-notification';
import {
  findExpiringCertificationsForOwner,
  sendTrainingCertificationExpiryNotifications,
} from '@/backend/services/training/training-certification-notification';
import { getActiveOwnerIds, runForEachOwner } from './cron-utils';

interface ExpiredComponentItem {
  tool_component_id: number;
  component_name: string;
  tool_id: number;
  tool_code: string;
  expiration_date: string;
}

/** Groups expired-component rows by owner id. */
export function groupExpiredComponentsByOwner(
  expiredComponents: {
    component_id: number;
    component_name: string;
    expiration_date: Date | null;
    tool: { tool_id: number; tool_code: string | null; fk_owner_id: number };
  }[]
): Map<number, ExpiredComponentItem[]> {
  const ownerMap = new Map<number, ExpiredComponentItem[]>();

  for (const comp of expiredComponents) {
    const ownerId = comp.tool.fk_owner_id;
    if (!ownerMap.has(ownerId)) {
      ownerMap.set(ownerId, []);
    }
    ownerMap.get(ownerId)!.push({
      tool_component_id: comp.component_id,
      component_name: comp.component_name,
      tool_id: comp.tool.tool_id,
      tool_code: comp.tool.tool_code as string, // may be null in DB; passed through unchanged
      expiration_date: comp.expiration_date?.toISOString() || '',
    });
  }

  return ownerMap;
}

export async function runComponentExpirationJob() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get all expired components across all owners
  const expiredComponents = await prisma.tool_component.findMany({
    where: {
      component_active: 'Y',
      expiration_date: { lte: today },
      tool: { tool_active: 'Y' },
    },
    select: {
      component_id: true,
      component_name: true,
      fk_tool_id: true,
      expiration_date: true,
      tool: {
        select: {
          tool_id: true,
          tool_code: true,
          fk_owner_id: true,
        },
      },
    },
  });

  if (expiredComponents.length === 0) {
    return { message: 'No expired components found', processed: 0 };
  }

  const ownerMap = groupExpiredComponentsByOwner(expiredComponents);

  let processedOwners = 0;
  let errors = 0;

  for (const [ownerId, components] of ownerMap.entries()) {
    try {
      await sendExpirationNotifications(ownerId, components);
      processedOwners++;
    } catch (error) {
      console.error(`[Cron] Failed to send expiration notifications for owner ${ownerId}:`, error);
      errors++;
    }
  }

  return {
    message: 'Component expiration check completed',
    expiredComponents: expiredComponents.length,
    processedOwners,
    errors,
  };
}

export async function runInsuranceExpirationJob() {
  const ownerIds = await getActiveOwnerIds();

  let totalExpiring = 0;
  const { processed, errors } = await runForEachOwner(
    ownerIds,
    'send insurance expiry notifications',
    async (ownerId) => {
      const expiring = await findExpiringInsurancesForOwner(ownerId);
      totalExpiring += expiring.length;
      await sendInsuranceExpiryNotifications(ownerId, expiring);
    }
  );

  return {
    message: 'Insurance expiration check completed',
    ownersChecked: ownerIds.length,
    processedOwners: processed,
    totalExpiring,
    errors,
  };
}

export async function runTrainingExpirationJob() {
  const ownerIds = await getActiveOwnerIds();

  let totalExpiring = 0;
  const { processed, errors } = await runForEachOwner(
    ownerIds,
    'send training certification expiry notifications',
    async (ownerId) => {
      const expiring = await findExpiringCertificationsForOwner(ownerId);
      totalExpiring += expiring.length;
      await sendTrainingCertificationExpiryNotifications(ownerId, expiring);
    }
  );

  return {
    message: 'Training certification expiration check completed',
    ownersChecked: ownerIds.length,
    processedOwners: processed,
    totalExpiring,
    errors,
  };
}
