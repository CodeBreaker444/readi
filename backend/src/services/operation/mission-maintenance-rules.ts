/**
 * Business rules for applying a finished mission's usage to component maintenance counters.
 *
 * PURE functions only (no database). maintenance-cycle-service.ts loads/saves the data and
 * calls these to decide what the new numbers are.
 */
import {
  CycleStatus,
  addHhmmHours,
  computeComponentStatus,
  getBatteryCycleRatio,
} from '@/backend/services/system/maintenance-rules';

export interface ComponentMaintenanceInfo {
  component_id: number;
  component_type: string | null;
  component_code: string | null;
  serial_number: string | null;
  current_hours: number;
  current_flights: number;
  current_days: number;
  limit_hour: number;
  limit_flight: number;
  limit_day: number;
  maintenance_cycle_type: string;
  last_maintenance_date: string | null;
  activation_date: string | null;
  status: CycleStatus;
  trigger: string[];
  battery_cycle_ratio: number;
}

/** Subset of tool_component columns needed to describe a component's maintenance state. */
export interface ComponentInfoSource {
  component_id: number;
  component_type: string | null;
  component_code: string | null;
  component_name: string;
  serial_number: string | null;
  maintenance_cycle: string | null;
  last_maintenance_date: Date | null;
  installation_date: Date | null;
}

export interface ComponentLimits {
  hour: number;
  flight: number;
  day: number;
}

export interface ComponentCounters {
  hours: number;
  flights: number;
  days: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export function readComponentLimits(comp: {
  maintenance_cycle_hour: unknown;
  maintenance_cycle_flight: unknown;
  maintenance_cycle_day: unknown;
}): ComponentLimits {
  return {
    hour: Number(comp.maintenance_cycle_hour ?? 0),
    flight: Number(comp.maintenance_cycle_flight ?? 0),
    day: Number(comp.maintenance_cycle_day ?? 0),
  };
}

export function readComponentCounters(comp: {
  current_maintenance_hours: unknown;
  current_maintenance_flights: unknown;
  current_maintenance_days: unknown;
}): ComponentCounters {
  return {
    hours: Number(comp.current_maintenance_hours ?? 0),
    flights: Number(comp.current_maintenance_flights ?? 0),
    days: Number(comp.current_maintenance_days ?? 0),
  };
}

/** Builds the API shape returned for one component (shared by the "get" and "update" flows). */
export function buildComponentMaintenanceInfo(
  comp: ComponentInfoSource,
  counters: ComponentCounters,
  limits: ComponentLimits,
  evaluation: { status: CycleStatus; trigger: string[] },
  batteryCycleRatio: number
): ComponentMaintenanceInfo {
  return {
    component_id: comp.component_id,
    component_type: comp.component_type ?? null,
    component_code: comp.component_code || comp.component_name,
    serial_number: comp.serial_number ?? null,
    current_hours: counters.hours,
    current_flights: counters.flights,
    current_days: counters.days,
    limit_hour: limits.hour,
    limit_flight: limits.flight,
    limit_day: limits.day,
    maintenance_cycle_type: comp.maintenance_cycle || 'NONE',
    last_maintenance_date: comp.last_maintenance_date?.toISOString() ?? null,
    activation_date: comp.installation_date?.toISOString() ?? null,
    status: evaluation.status,
    trigger: evaluation.trigger,
    battery_cycle_ratio: batteryCycleRatio,
  };
}

/** Status of a component, or OK when no limit is configured at all. */
export function evaluateComponent(counters: ComponentCounters, limits: ComponentLimits) {
  const hasLimits = limits.hour > 0 || limits.flight > 0 || limits.day > 0;
  return hasLimits
    ? computeComponentStatus(counters.hours, counters.flights, counters.days, limits)
    : { status: 'OK' as CycleStatus, trigger: [] as string[] };
}

export function worstStatus(a: CycleStatus, b: CycleStatus): CycleStatus {
  if (a === 'DUE' || b === 'DUE') return 'DUE';
  if (a === 'ALERT' || b === 'ALERT') return 'ALERT';
  return 'OK';
}

export interface MissionUsageInput {
  prevHours: number;
  prevFlights: number;
  prevLifetimeHours: number;
  meta: Record<string, unknown>;
  addHours: number;
  addFlights: number;
  /** true = the user typed the cycle count; do not apply the battery cycle ratio. */
  manualCyclesInput?: boolean;
}

export interface MissionUsageResult {
  batteryCycleRatio: number;
  /** Flights actually added to the counter (after the battery ratio). */
  effectiveFlightCycles: number;
  newHours: number;
  newFlights: number;
  newLifetimeHours: number;
  /** Counter values after this mission (unchanged when nothing was added for that counter). */
  finalHours: number;
  finalFlights: number;
  appliesHours: boolean;
  appliesFlights: boolean;
}

export function computeMissionUsage(input: MissionUsageInput): MissionUsageResult {
  const batteryCycleRatio = getBatteryCycleRatio(input.meta);
  const addFlights = input.addFlights || 0;
  const effectiveFlightCycles = input.manualCyclesInput
    ? round2(addFlights)
    : round2(addFlights * batteryCycleRatio);

  const newHours = addHhmmHours(input.prevHours, input.addHours || 0);
  const newFlights = round2(input.prevFlights + effectiveFlightCycles);
  const newLifetimeHours = addHhmmHours(input.prevLifetimeHours, input.addHours || 0);

  const appliesHours = input.addHours > 0;
  const appliesFlights = input.addFlights > 0;

  return {
    batteryCycleRatio,
    effectiveFlightCycles,
    newHours,
    newFlights,
    newLifetimeHours,
    finalHours: appliesHours ? newHours : input.prevHours,
    finalFlights: appliesFlights ? newFlights : input.prevFlights,
    appliesHours,
    appliesFlights,
  };
}

/** The tool_component columns to write for a mission update. */
export function buildMissionComponentPayload(
  usage: MissionUsageResult,
  meta: Record<string, unknown>,
  missionId: number,
  now: Date
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    current_usage_hours: usage.newLifetimeHours,
    component_metadata: {
      ...meta,
      last_mission_id: missionId,
      last_maintenance_update: now.toISOString(),
    },
  };

  if (usage.appliesHours) payload.current_maintenance_hours = usage.newHours;
  if (usage.appliesFlights) payload.current_maintenance_flights = usage.newFlights;

  return payload;
}
