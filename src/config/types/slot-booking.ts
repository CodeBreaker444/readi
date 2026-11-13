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
  decidedAt: string | null;
  note: string | null;
  pdfName: string | null;
}

export interface GroupDetail {
  group: SlotGroup;
  slots: Slot[];
  bookings: Booking[];
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
  note: string | null;
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
}

export interface PilotGroupMember {
  userId: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
}

export interface PilotGroup {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  members: PilotGroupMember[];
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
}

export interface PilotGroupInput {
  name: string;
  description?: string;
  memberIds: number[];
}
