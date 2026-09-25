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

export const DFLIGHT_ABORT_STATUSES = ['ABORT', 'ABORTED', 'ABORTING'];

export const DFLIGHT_MISSION_STOP_STATUSES = [...DFLIGHT_ABORT_STATUSES, 'CANCELLED', 'WITHDRAWN'];

export const DFLIGHT_AUTHORISATION_STOP_STATUSES = ['REJECTED', 'REVOKED', 'WITHDRAWN'];

export const DFLIGHT_CLEARANCE_STOP_STATUSES = ['CLEARANCE_REJECTED_BY_SYSTEM', 'CLEARANCE_REJECTED'];

export class DFlightNotAuthorizedError extends Error {
  code = 'DFLIGHT_NOT_AUTHORIZED';
  constructor() {
    super('This mission has not been authorized by D-Flight yet — it cannot be started until authorization is accepted.');
  }
}

export class DFlightAbortedError extends Error {
  code = 'DFLIGHT_ABORTED';
  constructor(message?: string) {
    super(message ?? 'D-Flight has aborted this mission — it can no longer proceed on the daily board.');
  }
}

/**
 * Throws if D-Flight has killed this mission — aborted/cancelled it
 * (mission_status), pulled or refused its authorization
 * (flight_authorisation_status), or rejected its clearance
 * (flight_clearance_status). A mission with no dflight_mission_id (D-Flight
 * not enabled, or the authorization request was never created/failed) is
 * left untouched — no gate applies.
 */
export function assertDFlightNotStopped(
  dflightMissionId: string | null | undefined,
  flightAuthorisationStatus: string | null | undefined,
  missionStatus?: string | null | undefined,
  flightClearanceStatus?: string | null | undefined,
): void {
  if (!dflightMissionId) return;

  const missionStatusUpper = missionStatus?.toUpperCase();
  const authStatusUpper = flightAuthorisationStatus?.toUpperCase();
  const clearanceStatusUpper = flightClearanceStatus?.toUpperCase();

  if (missionStatusUpper && DFLIGHT_MISSION_STOP_STATUSES.includes(missionStatusUpper)) {
    throw new DFlightAbortedError(`D-Flight has marked this mission as ${missionStatusUpper} — it can no longer proceed on the daily board.`);
  }
  if (authStatusUpper && DFLIGHT_AUTHORISATION_STOP_STATUSES.includes(authStatusUpper)) {
    throw new DFlightAbortedError(`D-Flight has ${authStatusUpper.toLowerCase()} this mission's flight authorization — it can no longer proceed on the daily board.`);
  }
  if (clearanceStatusUpper && DFLIGHT_CLEARANCE_STOP_STATUSES.includes(clearanceStatusUpper)) {
    throw new DFlightAbortedError('D-Flight has rejected this mission\'s flight clearance — it can no longer proceed on the daily board.');
  }
}

/**
 * Blocks starting a mission that has an active D-Flight authorization request
 * until D-Flight has accepted it, and blocks it again if D-Flight later
 * kills it out from under an existing acceptance (see assertDFlightNotStopped).
 * Used for the _START transition, where authorization must be affirmatively
 * ACCEPTED, not merely "not stopped yet".
 */
export function assertDFlightAuthorized(
  dflightMissionId: string | null | undefined,
  flightAuthorisationStatus: string | null | undefined,
  missionStatus?: string | null | undefined,
  flightClearanceStatus?: string | null | undefined,
): void {
  assertDFlightNotStopped(dflightMissionId, flightAuthorisationStatus, missionStatus, flightClearanceStatus);
  if (!dflightMissionId) return;
  if (flightAuthorisationStatus !== DFLIGHT_ACCEPTED_STATUS) {
    throw new DFlightNotAuthorizedError();
  }
}
