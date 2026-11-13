/**
 * Pilot groups: role guard, company scoping, member validation, unique names, and the shared validation schema.
 * Prisma and the audit logger are mocked.
 *
 * Run:  npm test -- pilot-groups
 */

const prismaMock: Record<string, any> = {
  pilot_group: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  pilot_group_member: { deleteMany: jest.fn(), createMany: jest.fn() },
  public_users: { findMany: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
const getPresignedDownloadUrl = jest.fn(async (key: string) => `https://s3.example/${key}?sig=1`);
jest.mock('@/lib/s3Client', () => ({ getPresignedDownloadUrl: (k: string) => getPresignedDownloadUrl(k) }));
jest.mock('../../../../lib/resend/mail', () => ({ sendNotificationEmailWithAttachments: jest.fn() }));
jest.mock('@/backend/services/email/email-limit-service', () => ({
  isDailyEmailLimitReached: jest.fn(),
  incrementDailyEmailCount: jest.fn(),
}));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));

import {
  createPilotGroup,
  deletePilotGroup,
  listCandidates,
  updatePilotGroup,
} from '@/backend/services/slot-booking/pilot-group-service';
import { SlotBookingError } from '@/backend/services/slot-booking/slot-booking-service';
import type { SessionUser } from '@/lib/auth/server-session';
import { pilotGroupSchema } from '@/lib/pilot-group-validation';

const user = (role: string, userId = 1): SessionUser =>
  ({ userId, ownerId: 7, role, fullname: 'Test User', email: 't@example.com' }) as unknown as SessionUser;
const OPM = user('OPM');
const PIC = user('PIC', 2);

const dbUser = (id: number) => ({ user_id: id, first_name: `U${id}`, last_name: 'X', username: `u${id}`, user_role: 'PIC' });
const dbGroup = (id: number, name: string, memberIds: number[]) => ({
  pilot_group_id: id,
  fk_owner_id: 7,
  name,
  description: null,
  created_by: 1,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  users: dbUser(1),
  pilot_group_member: memberIds.map((m) => ({ fk_user_id: m, users: dbUser(m) })),
});

const rejects = async (p: Promise<unknown>, status: number) => {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(SlotBookingError);
  expect((err as SlotBookingError).status).toBe(status);
  return err as SlotBookingError;
};

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.pilot_group.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockResolvedValue([]);
});

describe('pilotGroupSchema', () => {
  it('accepts a valid body and trims the name', () => {
    const r = pilotGroupSchema.safeParse({ name: '  Experts  ', description: 'Senior', memberIds: [1, 2] });
    expect(r.success && r.data.name).toBe('Experts');
  });

  it.each([
    ['empty name', { name: '   ', memberIds: [] }],
    ['name too long', { name: 'a'.repeat(101), memberIds: [] }],
    ['control characters in name', { name: 'bad\u0000name', memberIds: [] }],
    ['description too long', { name: 'ok', description: 'a'.repeat(501), memberIds: [] }],
    ['non-integer member id', { name: 'ok', memberIds: [1.5] }],
    ['negative member id', { name: 'ok', memberIds: [-1] }],
    ['string member id', { name: 'ok', memberIds: ['1'] }],
    ['duplicate members', { name: 'ok', memberIds: [3, 3] }],
    ['too many members', { name: 'ok', memberIds: Array.from({ length: 501 }, (_, i) => i + 1) }],
    ['missing memberIds', { name: 'ok' }],
  ])('rejects %s', (_label, body) => {
    expect(pilotGroupSchema.safeParse(body).success).toBe(false);
  });
});

describe('pilot group service', () => {
  it('only lets managers manage groups', async () => {
    await rejects(createPilotGroup(PIC, { name: 'A', memberIds: [] }), 403);
    await rejects(updatePilotGroup(PIC, 1, { name: 'A', memberIds: [] }), 403);
    await rejects(deletePilotGroup(PIC, 1), 403);
    await rejects(listCandidates(PIC), 403);
    expect(prismaMock.pilot_group.create).not.toHaveBeenCalled();
  });

  it('creates a group with trimmed name and de-duplicated members', async () => {
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 2 }, { user_id: 3 }]);
    prismaMock.pilot_group.create.mockResolvedValue({ pilot_group_id: 10 });
    prismaMock.pilot_group.findFirst.mockResolvedValue(dbGroup(10, 'Experts', [2, 3]));

    const g = await createPilotGroup(OPM, { name: ' Experts ', memberIds: [2, 3, 2] });

    const data = prismaMock.pilot_group.create.mock.calls[0][0].data;
    expect(data.name).toBe('Experts');
    expect(data.fk_owner_id).toBe(7);
    expect(data.pilot_group_member.create).toEqual([{ fk_user_id: 2 }, { fk_user_id: 3 }]);
    expect(g.memberCount).toBe(2);
  });

  it('rejects members from another company or inactive users', async () => {
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 2 }]);
    const err = await rejects(createPilotGroup(OPM, { name: 'A', memberIds: [2, 99] }), 400);
    expect(err.extra).toMatchObject({ invalidIds: [99] });
    // the company + active filter must be part of the lookup
    expect(prismaMock.public_users.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 7, user_active: 'Y' });
    expect(prismaMock.pilot_group.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate name (case-insensitive) with 409', async () => {
    prismaMock.pilot_group.findMany.mockResolvedValue([{ pilot_group_id: 4 }]);
    const err = await rejects(createPilotGroup(OPM, { name: 'experts', memberIds: [] }), 409);
    expect(err.extra).toMatchObject({ field: 'name' });
  });

  it('maps a database unique violation (simultaneous create) to 409', async () => {
    prismaMock.pilot_group.create.mockRejectedValue({ code: 'P2002' });
    await rejects(createPilotGroup(OPM, { name: 'Race', memberIds: [] }), 409);
  });

  it('returns 404 for a group of another company', async () => {
    prismaMock.pilot_group.findFirst.mockResolvedValue(null);
    await rejects(updatePilotGroup(OPM, 5, { name: 'A', memberIds: [] }), 404);
    await rejects(deletePilotGroup(OPM, 5), 404);
    expect(prismaMock.pilot_group.findFirst.mock.calls[0][0].where).toMatchObject({ pilot_group_id: 5, fk_owner_id: 7 });
    expect(prismaMock.pilot_group.delete).not.toHaveBeenCalled();
  });

  it('updates the group, replacing the member set in one transaction', async () => {
    prismaMock.pilot_group.findFirst
      .mockResolvedValueOnce(dbGroup(10, 'Experts', [2, 3]))
      .mockResolvedValueOnce(dbGroup(10, 'Senior', [3, 4]));
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 3 }, { user_id: 4 }]);

    const g = await updatePilotGroup(OPM, 10, { name: 'Senior', memberIds: [3, 4] });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.pilot_group_member.deleteMany).toHaveBeenCalledWith({
      where: { fk_pilot_group_id: 10, fk_user_id: { notIn: [3, 4] } },
    });
    expect(g.name).toBe('Senior');
  });

  it('lets a group keep its own name on update', async () => {
    prismaMock.pilot_group.findFirst.mockResolvedValue(dbGroup(10, 'Experts', []));
    await updatePilotGroup(OPM, 10, { name: 'Experts', memberIds: [] });
    expect(prismaMock.pilot_group.findMany.mock.calls[0][0].where).toMatchObject({ NOT: { pilot_group_id: 10 } });
  });

  it('deletes an owned group', async () => {
    prismaMock.pilot_group.findFirst.mockResolvedValue(dbGroup(10, 'Experts', [2]));
    await deletePilotGroup(OPM, 10);
    expect(prismaMock.pilot_group.delete).toHaveBeenCalledWith({ where: { pilot_group_id: 10 } });
  });

  it('signs S3 profile pictures, keeps legacy URLs, and falls back to null', async () => {
    prismaMock.public_users.findMany.mockResolvedValue([
      { ...dbUser(1), users_profile: { profile_picture: 'avatars/1.png' } },
      { ...dbUser(2), users_profile: { profile_picture: 'https://cdn.example/b.png' } },
      { ...dbUser(3), users_profile: null },
      { ...dbUser(4), users_profile: { profile_picture: 'avatars/broken.png' } },
    ]);
    getPresignedDownloadUrl.mockImplementation(async (key: string) => {
      if (key.includes('broken')) throw new Error('S3 down');
      return `https://s3.example/${key}?sig=1`;
    });
    const list = await listCandidates(OPM);
    const byId = Object.fromEntries(list.map((c) => [c.userId, c.avatarUrl]));
    expect(byId).toEqual({ 1: 'https://s3.example/avatars/1.png?sig=1', 2: 'https://cdn.example/b.png', 3: null, 4: null });
  });

  it('lists only active users of the caller’s company as candidates', async () => {
    prismaMock.public_users.findMany.mockResolvedValue([dbUser(3), dbUser(2)]);
    const list = await listCandidates(OPM);
    expect(prismaMock.public_users.findMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 7, user_active: 'Y' });
    expect(list.map((c) => c.userId)).toEqual([2, 3]);
  });
});
