import type { SessionUser } from './server-session';

/** A PIC who is not an OPM-like manager may add themselves to a pilot-less mission, but never change a pilot. */
export function isSelfAssignOnly(user: Pick<SessionUser, 'role' | 'isManager'>): boolean {
  return user.role === 'PIC' && !user.isManager;
}

/**
 * True when `user` may set `newPilotId` on a mission whose current pilot is `currentPilotId`.
 * Restricted users: unchanged is fine, and filling an empty slot with themselves is fine; nothing else.
 */
export function canChangePilot(
  user: Pick<SessionUser, 'role' | 'isManager' | 'userId'>,
  newPilotId: number,
  currentPilotId: number | null | undefined,
): boolean {
  if (!isSelfAssignOnly(user)) return true;
  if (newPilotId === (currentPilotId ?? null)) return true;
  return currentPilotId == null && newPilotId === user.userId;
}
