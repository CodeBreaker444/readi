/**
 * A mission auto-aborted for missing its scheduled date (or aborted manually)
 * is a closed record — no further writes are allowed from any code path.
 */
export const MISSION_LOCKED_STATUS = 'ABORTED';
export const MISSION_LOCKED_MESSAGE = 'This mission has been aborted and can no longer be edited.';

export class MissionLockedError extends Error {
  code = 'MISSION_LOCKED';
  constructor() {
    super(MISSION_LOCKED_MESSAGE);
  }
}

export function assertMissionEditable(statusName: string | null | undefined): void {
  if (statusName === MISSION_LOCKED_STATUS) {
    throw new MissionLockedError();
  }
}

export const DFLIGHT_ACCEPTED_STATUS = 'ACCEPTED';

export class DFlightNotAuthorizedError extends Error {
  code = 'DFLIGHT_NOT_AUTHORIZED';
  constructor() {
    super('This mission has not been authorized by D-Flight yet — it cannot be started until authorization is accepted.');
  }
}

/**
 * Blocks starting a mission that has an active D-Flight authorization request
 * until D-Flight has accepted it. A mission with no dflight_mission_id (D-Flight
 * not enabled, or the authorization request was never created/failed) is left
 * untouched — no gate applies.
 */
export function assertDFlightAuthorized(
  dflightMissionId: string | null | undefined,
  flightAuthorisationStatus: string | null | undefined,
): void {
  if (!dflightMissionId) return;
  if (flightAuthorisationStatus !== DFLIGHT_ACCEPTED_STATUS) {
    throw new DFlightNotAuthorizedError();
  }
}
