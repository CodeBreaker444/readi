import { getEventOptions, isScopedUser } from '@/backend/services/logbook/event-logbook-service';
import { getDefaultContactMap, listContacts } from '@/backend/services/logbook/event-notification-service';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { getSessionEffectivePermissions } from '@/lib/auth/feature-permissions';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'create');
    if (error) return error;

    const user = session!.user;
    const [options, perms, scoped, contacts, defaultContacts] = await Promise.all([
      getEventOptions(user),
      getSessionEffectivePermissions(user),
      isScopedUser(user),
      listContacts(user.ownerId),
      getDefaultContactMap(user.ownerId),
    ]);

    return NextResponse.json({
      code: 200,
      ...options,
      // Contact book + per-client defaults, for choosing who is emailed about a new event.
      contacts: contacts.map(({ contact_id, name, company, email }) => ({ contact_id, name, company, email })),
      default_contacts: defaultContacts,
      scoped,
      can_report: perms.logbook_event === 'A',
      can_configure_webhooks: ['ADMIN', 'OPM', 'SUPERADMIN'].includes(user.role),
    });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
