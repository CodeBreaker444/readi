export type SlotMode = 'HOURLY' | 'SHIFT';
export type RangeMode = 'DAY' | 'WEEK' | 'TWO_WEEKS';
export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SlotDefaults {
  mode: SlotMode;
  hourStart: number;
  hourEnd: number;
  rangeMode: RangeMode;
  blocked: boolean;
  /** 0 = Sunday … 6 = Saturday */
  approvalDays: number[];
  /** Hours before the approval day during which pilots cannot cancel or move a request (0 = never locked). */
  modifyLockHours: 0 | 24 | 48;
  /** Day of the month (1–28) on which each flying-hours cycle starts, e.g. 10 = the 10th of every month. */
  cycleStartDay: number;
}

/** About a pilot who asked for a slot: experience, recent flying, ranking, groups and what they asked for in this slot group. */
export interface PilotProfile {
  /** Missions flown, all time. */
  totalFlights: number;
  /** Missions flown in the last 7 days, and how many of those on a Saturday or Sunday. */
  weekFlights: number;
  weekWeekendFlights: number;
  /** Merit score (0–100) and rank among the company's pilots; null when the pilot is not ranked. */
  score: number | null;
  rank: number | null;
  rankedPilots: number;
  groups: Array<{ id: number; name: string; expert: boolean }>;
  /** Slots of this slot group the pilot asked for (any status; slots assigned directly by the OPM do not count). */
  appliedInGroup: number;
  /** Of those, slots on a Saturday or Sunday. */
  appliedWeekendInGroup: number;
}

/** Hours a pilot flew in the current cycle against their monthly limit. */
export interface PilotFlight {
  /** Hours flown (from missions) in the current cycle. */
  cycleHours: number;
  /** All-time hours flown. */
  totalHours: number;
  /** Monthly limit, null while none is assigned. */
  limitHours: number | null;
  /** none = no limit (grey), ok, warn = 90% or more (yellow), over = 100% or more (red). */
  level: 'none' | 'ok' | 'warn' | 'over';
  /** First day of the current cycle (yyyy-MM-dd) and the day the next one starts. */
  cycleStart: string;
  cycleEnd: string;
}

export type WeatherLevel = 'calm' | 'moderate' | 'tough';

/** Forecast for one slot's time window (only available for the next 7 days). */
export interface SlotWeather {
  level: WeatherLevel;
  /** Main reason the weather is not calm. */
  limiting: string | null;
  avgWindMs: number;
  maxGustMs: number;
  rainMm: number;
  tempC: number | null;
  weatherCode: number;
}

export interface SlotClient {
  id: number;
  name: string;
}

export interface SlotGroup {
  id: number;
  name: string;
  description: string;
  mode: SlotMode;
  hourStart: number;
  hourEnd: number;
  rangeMode: RangeMode;
  /** yyyy-MM-dd */
  startDate: string;
  blocked: boolean;
  approvalDays: number[];
  createdAt: string;
  createdByName: string | null;
  stats?: { openSlots: number; pending: number; approved: number };
  clientId: number | null;
  clientName: string | null;
  /** System the slot weather is forecast for; null = no weather. */
  systemId: number | null;
  systemName: string | null;
  /** When pilots get to see the group; null = published immediately. */
  publishAt: string | null;
  /** False while a scheduled group is still hidden from pilots. */
  published: boolean;
  /** Pilot groups the slots are offered to (empty = every pilot). */
  audience: Array<{ id: number; name: string }>;
}

export interface Slot {
  id: number;
  groupId: number;
  date: string; /** yyyy-MM-dd */
  start: string;  /** HH:mm */
  end: string;
  active: boolean;
}

export interface Booking {
  id: number;
  slotId: number;
  groupId: number;
  picId: number;
  picName: string;
  status: BookingStatus;
  requestedAt: string;
  /** Placed directly by the OPM/admin, so the pilot never requested it. */
  assignedByOpm: boolean;
  decidedAt: string | null;
  note: string | null;
  pdfName: string | null;
  /** OPM only, pending requests: the pilot's other approved slot that overlaps this one. */
  collision?: string | null;
  /** OPM only: the pilot's flying hours this cycle against their monthly limit. */
  flight?: PilotFlight;
  /** OPM only: what the OPM needs to know about the pilot when deciding. */
  profile?: PilotProfile;
}

export interface GroupDetail {
  group: SlotGroup;
  slots: Slot[];
  bookings: Booking[];
  /** OPM only: forecast per slot id for slots in the next 7 days. */
  weather?: Record<number, SlotWeather>;
  /** OPM only: why there is no forecast ("no_location" | "unavailable"), when slots in range lack one. */
  weatherNote?: 'no_location' | 'unavailable' | null;
}

export interface ApprovedSlotRow {
  bookingId: number;
  date: string;
  start: string;
  end: string;
  groupId: number;
  groupName: string;
  picId: number;
  picName: string;
  decidedAt: string | null;
  pdfName: string | null;
}

/** One of the signed-in pilot's own requests, any status. */
export interface MyBookingRow extends ApprovedSlotRow {
  status: BookingStatus;
  requestedAt: string;
  /** Placed directly by the OPM/admin, so the pilot never requested it. */
  assignedByOpm: boolean;
  note: string | null;
  /** Pending request that can no longer be cancelled or moved because the approval day is close. */
  locked: boolean;
  /** Start of the approval day the lock counts down to. */
  approvalAt: string | null;
}

export interface SlotMe {
  userId: number;
  name: string;
  role: string;
  /** OPM / ADMIN / SUPERADMIN: creates groups, approves, sees every pilot's requests */
  canManage: boolean;
  /** PIC: requests slots */
  canBook: boolean;
}

export interface SlotAuditRow {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  user_name: string | null;
  user_role: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NewSlotGroupInput {
  name: string;
  description?: string;
  mode: SlotMode;
  hourStart: number;
  hourEnd: number;
  rangeMode: RangeMode;
  startDate: string;
  blocked: boolean;
  approvalDays: number[];
  /** Only the slots the OPM left activated. */
  slots: Array<{ date: string; start: string; end: string }>;
  /** What to do when slots already exist on the selected dates. */
  resolution: 'none' | 'merge' | 'overwrite';
  clientId?: number | null;
  /** System (of the client) whose location drives the slot weather. */
  systemId?: number | null;
  /** ISO time to open the group to pilots; omit to publish now. */
  publishAt?: string | null;
  /** Pilot groups the slots are offered to; omit/empty for every pilot. */
  pilotGroupIds?: number[];
}

export interface PilotGroupMember {
  userId: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  /** Monthly flight limit in hours, null = not assigned. */
  monthlyLimitHours: number | null;
}

export interface PilotGroup {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  members: PilotGroupMember[];
  /** Recommended for tough-weather slots. */
  isExpert: boolean;
  createdAt: string;
  createdByName: string | null;
}

/** A company user who can be placed in a pilot group. */
export interface PilotGroupCandidate {
  userId: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  /** Monthly flight limit in hours, null = not assigned. */
  monthlyLimitHours: number | null;
}

export interface PilotGroupInput {
  name: string;
  description?: string;
  memberIds: number[];
  isExpert?: boolean;
  /** Monthly flight limits to save for users (null removes the limit). */
  flightLimits?: Array<{ userId: number; hours: number | null }>;
}

// ───────────────────────── Assignment, day preview, merits ─────────────────────────

/** A pilot who could be assigned to a slot, with what the OPM needs to decide. */
export interface SlotCandidate {
  userId: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  groups: Array<{ id: number; name: string; expert: boolean }>;
  expert: boolean;
  hours90: number;
  score: number;
  /** The pilot asked for this slot. */
  requested: boolean;
  /** Their overlapping approved slot, when they are not available. */
  collision: string | null;
  flight: PilotFlight;
}

export interface SlotCandidates {
  slotId: number;
  groupName: string;
  date: string;
  start: string;
  end: string;
  weather: SlotWeather | null;
  /** Pilot currently assigned, if any. */
  assignedPilotId: number | null;
  candidates: SlotCandidate[];
}

export interface DayPreviewRow {
  slotId: number;
  groupId: number;
  groupName: string;
  clientName: string | null;
  start: string;
  end: string;
  /** Approved pilot, null while unassigned. */
  pilotId: number | null;
  pilotName: string | null;
  pending: number;
  weather: SlotWeather | null;
}

export interface DayPreview {
  date: string;
  rows: DayPreviewRow[];
  total: number;
  assigned: number;
  unassigned: number;
  weatherNote: 'no_location' | 'unavailable' | 'out_of_range' | null;
  /** When the forecast behind the weather was last fetched. */
  weatherFetchedAt: string | null;
}

export interface MeritRow {
  userId: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  groups: Array<{ id: number; name: string; expert: boolean }>;
  hours90: number;
  hoursTotal: number;
  requests90: number;
  weekendRequests90: number;
  approved90: number;
  score: number;
  rank: number;
}

export interface Merits {
  windowDays: number;
  weights: { weekend: number; availability: number; hours: number };
  rows: MeritRow[];
}

/** The signed-in pilot's own numbers. */
export interface MyStats {
  windowDays: number;
  hours90: number;
  hoursTotal: number;
  requests90: number;
  weekendRequests90: number;
  approved90: number;
  score: number;
  rank: number;
  pilots: number;
}

/** The pilot flying a calendar slot, with what the OPM may want to know about them. */
export interface CalendarPilot {
  userId: number;
  name: string;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
  approvedAt: string | null;
  /** Placed directly by the OPM, not requested by the pilot. */
  assignedByOpm: boolean;
  flight: PilotFlight;
}

export interface CalendarPending {
  userId: number;
  name: string;
  requestedAt: string;
  flight: PilotFlight;
}

/** One slot of the week calendar with everything the detail modal shows. */
export interface CalendarSlot {
  slotId: number;
  date: string;
  start: string;
  end: string;
  groupId: number;
  groupName: string;
  groupDescription: string;
  mode: SlotMode;
  blocked: boolean;
  approvalDays: number[];
  clientName: string | null;
  pilot: CalendarPilot | null;
  pending: CalendarPending[];
  weather: SlotWeather | null;
  /** Overlaps with other slots for the pilots on this slot. */
  alerts: CalendarAlert[];
}

/**
 * The same pilot on two overlapping slots, usually of different slot groups or clients.
 * conflict = assigned to both (red); risk = at least one is still a request, so approving it would clash (amber).
 */
export interface CalendarAlert {
  severity: 'conflict' | 'risk';
  pilotId: number;
  pilotName: string;
  /** The pilot's status on this slot. */
  status: 'APPROVED' | 'PENDING';
  other: {
    slotId: number;
    date: string;
    start: string;
    end: string;
    groupName: string;
    clientName: string | null;
    status: 'APPROVED' | 'PENDING';
  };
}

export interface CalendarDay {
  date: string;
  slots: CalendarSlot[];
}

export interface WeekCalendar {
  start: string;
  days: CalendarDay[];
  total: number;
  assigned: number;
  unassigned: number;
  weatherNote: 'no_location' | 'unavailable' | 'out_of_range' | null;
  /** When the forecast behind the weather was last fetched. */
  weatherFetchedAt: string | null;
}

/** An active system (drone) that can be chosen for a slot group; its location drives the slot weather. */
export interface SlotSystem {
  id: number;
  name: string;
  /** Client the system is assigned to. */
  clientId: number | null;
  /** False when the system has no coordinates, so no weather can be shown. */
  hasLocation: boolean;
}
