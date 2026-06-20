/**
 * Unit tests for backend/src/services/user/user-management.ts
 *
 * These tests mock Prisma and Supabase — no real database is needed.
 * Run:  npm test -- user-management
 */

import {
  createUser,
  deleteUser,
  getUserListByOwner,
  updateUser,
} from '../services/user/user-management';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/backend/config/env', () => ({
  env: { APP_URL: 'http://localhost:3000', JWT_SECRET: 'test-secret' },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    public_users:     { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    user_owner:       { create: jest.fn(), updateMany: jest.fn() },
    users_profile:    { create: jest.fn(), update: jest.fn() },
    user_settings:    { create: jest.fn() },
    notification:        { deleteMany: jest.fn() },
    checklist:           { updateMany: jest.fn() },
    kanban:              { updateMany: jest.fn() },
    planning_logbook:    { updateMany: jest.fn() },
    training_attendance: { deleteMany: jest.fn() },
  },
}));

jest.mock('@/backend/database/database', () => ({
  supabase: { from: jest.fn(), auth: { admin: { deleteUser: jest.fn().mockResolvedValue({}) } } },
}));

// Extract references after mocks are registered
const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma');
const { supabase: mockSupabase } = jest.requireMock('@/backend/database/database');
const mockDeleteAuthUser = mockSupabase.auth.admin.deleteUser as jest.Mock;

jest.mock('../../../lib/resend/mail', () => ({
  sendUserActivationEmail: jest.fn().mockResolvedValue({ message: 'Email sent' }),
}));

jest.mock('bcrypt', () => ({
  hash:    jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));


beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleteAuthUser.mockResolvedValue({});
  // Promise.allSettled calls — these are best-effort cleanups that should not throw
  mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.checklist.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.kanban.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.planning_logbook.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.training_attendance.deleteMany.mockResolvedValue({ count: 0 });
});


describe('getUserListByOwner', () => {
  it('returns formatted user list for an owner', async () => {
    mockPrisma.public_users.findMany.mockResolvedValue([
      {
        user_id: 2,
        username: 'john.doe',
        email: 'john@test.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
        user_active: 'Y',
        user_role: 'PIC',
        user_unique_code: 'USR-001',
        auth_user_id: 'auth-123',
        is_viewer: 'N',
        is_manager: 'Y',
        fk_owner_id: 10,
        fk_client_id: null,
        fk_territorial_unit: null,
        fk_user_profile_id: 8,
        users_profile: { profile_picture: null, user_signature: null },
        owner: { owner_code: 'OWN001', owner_name: 'Test Company' },
        owner_territorial_unit_users_fk_territorial_unitToowner_territorial_unit: null,
      },
    ]);

    const result = await getUserListByOwner(10, 8, 1);

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.data[0]).toMatchObject({
      user_id: 2,
      username: 'john.doe',
      fullname: 'John Doe',
      email: 'john@test.com',
      user_role: 'PIC',
      active: 1,
      is_pending: false,
    });
  });

  it('returns empty list when no users exist for owner', async () => {
    mockPrisma.public_users.findMany.mockResolvedValue([]);

    const result = await getUserListByOwner(99, 0, 1);
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(result.data).toHaveLength(0);
  });

  it('marks user as pending when user_active is N and no auth_user_id', async () => {
    mockPrisma.public_users.findMany.mockResolvedValue([
      {
        user_id: 3,
        username: 'pending.user',
        email: 'pending@test.com',
        first_name: 'Pending',
        last_name: 'User',
        phone: null,
        user_active: 'N',
        user_role: 'TM',
        user_unique_code: 'USR-002',
        auth_user_id: null,
        is_viewer: 'N',
        is_manager: 'N',
        fk_owner_id: 10,
        fk_client_id: null,
        fk_territorial_unit: null,
        fk_user_profile_id: null,
        users_profile: null,
        owner: null,
        owner_territorial_unit_users_fk_territorial_unitToowner_territorial_unit: null,
      },
    ]);

    const result = await getUserListByOwner(10, 0, 1);
    expect(result.data[0].is_pending).toBe(true);
    expect(result.data[0].active).toBe(0);
  });

  it('throws when Prisma query fails', async () => {
    mockPrisma.public_users.findMany.mockRejectedValue(new Error('DB connection error'));
    await expect(getUserListByOwner(10, 0, 1)).rejects.toThrow('Failed to fetch user list');
  });
});
// ─── createUser ───────────────────────────────────────────────────────────────

const validCreatePayload = {
  username: 'newuser',
  fullname: 'New User',
  email: 'newuser@test.com',
  fk_user_profile_id: 14,  
  user_type: 'EMPLOYEE',
  is_viewer: 'N' as const,
  is_manager: 'N' as const,
  timezone: 'UTC',
  owner_id: 10,
};

describe('createUser', () => {
  beforeEach(() => {
    // Default: email and username are both free
    mockPrisma.public_users.findFirst.mockResolvedValue(null);
    mockPrisma.public_users.create.mockResolvedValue({ user_id: 100 });
    mockPrisma.user_owner.create.mockResolvedValue({ user_owner_id: 50 });
    mockPrisma.users_profile.create.mockResolvedValue({});
    mockPrisma.user_settings.create.mockResolvedValue({});
  });

  it('creates a user and returns userId + activation key', async () => {
    const result = await createUser(validCreatePayload);

    expect(result.success).toBe(true);
    expect(result.userId).toBe(100);
    expect(typeof result.activationKey).toBe('string');
    expect(result.activationKey.length).toBeGreaterThan(20);
  });

  it('sends activation email on successful creation', async () => {
    const { sendUserActivationEmail } = jest.requireMock('../../../lib/resend/mail');
    await createUser(validCreatePayload);

    expect(sendUserActivationEmail).toHaveBeenCalledWith(
      'newuser@test.com',
      'New User',
      expect.objectContaining({ username: 'newuser' })
    );
    expect((await createUser(validCreatePayload)).emailSent).toBe(true);
  });

  it('throws when email already exists and user is active', async () => {
    mockPrisma.public_users.findFirst.mockResolvedValue({
      user_id: 55,
      email: 'newuser@test.com',
      username: 'differentusername',
      user_active: 'Y',
      auth_user_id: 'auth-55',
    });

    await expect(createUser(validCreatePayload)).rejects.toThrow(
      'A user with this email already exists'
    );
  });

  it('throws PENDING_ACTIVATION error when existing user has not activated', async () => {
    mockPrisma.public_users.findFirst.mockResolvedValue({
      user_id: 66,
      email: 'newuser@test.com',
      username: 'differentusername',
      user_active: 'N',
      auth_user_id: null,
    });

    await expect(createUser(validCreatePayload)).rejects.toThrow('PENDING_ACTIVATION:66');
  });

  it('throws when username is already taken', async () => {
    // First call (byEmail): null. Second call (byUsername): existing user
    mockPrisma.public_users.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        user_id: 77,
        email: 'other@test.com',
        username: 'newuser',
        user_active: 'Y',
        auth_user_id: 'auth-77',
      });

    await expect(createUser(validCreatePayload)).rejects.toThrow(
      'This username is already taken'
    );
  });

  it('reports emailSent: false when email sending fails', async () => {
    const { sendUserActivationEmail } = jest.requireMock('../../../lib/resend/mail');
    sendUserActivationEmail.mockRejectedValueOnce(new Error('SMTP timeout'));

    const result = await createUser(validCreatePayload);
    expect(result.success).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(result.emailError).toContain('SMTP timeout');
  });
});

// ─── updateUser ───────────────────────────────────────────────────────────────

const validUpdatePayload = {
  user_id: 10,
  owner_id: 10,
  fullname: 'Updated Name',
  email: 'updated@test.com',
  fk_user_profile_id: 14,
  user_type: 'EMPLOYEE' as const,
  active: 1,
  is_viewer: 'N' as const,
  is_manager: 'Y' as const,
};

describe('updateUser', () => {
  beforeEach(() => {
    mockPrisma.public_users.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.users_profile.update.mockResolvedValue({});
    mockPrisma.user_owner.updateMany.mockResolvedValue({ count: 1 });
  });

  it('updates user fields and returns success', async () => {
    const result = await updateUser(validUpdatePayload);
    expect(result.success).toBe(true);
    expect(result.message).toBe('User updated successfully');
  });

  it('updates public_users with correct active flag', async () => {
    await updateUser({ ...validUpdatePayload, active: 0 });
    expect(mockPrisma.public_users.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_active: 'N' }),
      })
    );
  });

  it('also updates users_profile when user_image is provided', async () => {
    await updateUser({ ...validUpdatePayload, user_image: 'avatars/user-10.jpg' });
    expect(mockPrisma.users_profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ profile_picture: 'avatars/user-10.jpg' }),
      })
    );
  });

  it('does NOT update users_profile when no image fields provided', async () => {
    await updateUser(validUpdatePayload);
    expect(mockPrisma.users_profile.update).not.toHaveBeenCalled();
  });

  it('throws when Prisma update fails', async () => {
    mockPrisma.public_users.updateMany.mockRejectedValue(new Error('constraint violation'));
    await expect(updateUser(validUpdatePayload)).rejects.toThrow('Failed to update user');
  });

  it('converts nullable fields to null correctly', async () => {
    await updateUser({ ...validUpdatePayload, fk_territorial_unit: undefined, fk_client_id: undefined });
    const callArgs = mockPrisma.public_users.updateMany.mock.calls[0][0];
    expect(callArgs.data.fk_territorial_unit).toBeNull();
    expect(callArgs.data.fk_client_id).toBeNull();
  });
});

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  const userRecord: Record<string, any> = {
    auth_user_id: 'auth-uuid-999',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@test.com',
  };

  function setupSuccessfulDelete(record: Record<string, any> = userRecord) {
    mockPrisma.public_users.findFirst.mockResolvedValue(record);
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.checklist.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.kanban.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.planning_logbook.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.public_users.deleteMany.mockResolvedValue({ count: 1 });
  }

  it('deletes user and removes Supabase auth user', async () => {
    setupSuccessfulDelete();

    const result = await deleteUser(99, 10);
    expect(result.success).toBe(true);
    expect(result.fullName).toBe('Jane Smith');
    expect(mockDeleteAuthUser).toHaveBeenCalledWith('auth-uuid-999');
  });

  it('does NOT call deleteAuthUser when user has no auth_user_id', async () => {
    setupSuccessfulDelete({ ...userRecord, auth_user_id: null });

    await deleteUser(99, 10);
    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });

  it('throws when user not found in org', async () => {
    mockPrisma.public_users.findFirst.mockResolvedValue(null);
    await expect(deleteUser(999, 10)).rejects.toThrow(
      'User not found or does not belong to this organization'
    );
  });

  it('isSuperAdmin=true bypasses owner check', async () => {
    setupSuccessfulDelete();

    await deleteUser(99, 0, true);
    expect(mockPrisma.public_users.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ fk_owner_id: expect.anything() }),
      })
    );
  });

  it('continues gracefully when Supabase auth deletion fails', async () => {
    setupSuccessfulDelete();
    mockDeleteAuthUser.mockRejectedValue(new Error('Supabase auth error'));

    const result = await deleteUser(99, 10);
    expect(result.success).toBe(true);
  });
});
