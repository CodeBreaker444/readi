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
