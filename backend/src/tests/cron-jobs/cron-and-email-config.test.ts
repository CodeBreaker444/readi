jest.mock('@/lib/prisma', () => ({ prisma: {} }));

import { isAuthorizedCronRequest, runForEachOwner } from '@/backend/services/cron/cron-utils';
import { shouldResetEmailCounter } from '@/backend/services/cron/email-counter-cron-job';
import { groupExpiredComponentsByOwner } from '@/backend/services/cron/expiration-cron-jobs';
import { isModuleFlagEnabled, mergeRecipientEmails } from '@/backend/services/settings/module-email-config';

describe('cron auth', () => {
  it('rejects when secret is not configured (even with a matching header)', () => {
    expect(isAuthorizedCronRequest('Bearer undefined', undefined)).toBe(false);
    expect(isAuthorizedCronRequest('Bearer ', '')).toBe(false);
  });
  it('accepts only the exact bearer secret', () => {
    expect(isAuthorizedCronRequest('Bearer s3cret', 's3cret')).toBe(true);
    expect(isAuthorizedCronRequest('s3cret', 's3cret')).toBe(false);
    expect(isAuthorizedCronRequest(null, 's3cret')).toBe(false);
  });
});

describe('runForEachOwner', () => {
  it('one owner failing does not stop the others', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const seen: number[] = [];
    const r = await runForEachOwner([1, 2, 3], 'do thing', async (id) => {
      seen.push(id);
      if (id === 2) throw new Error('boom');
    });
    expect(seen).toEqual([1, 2, 3]);
    expect(r).toEqual({ processed: 2, errors: 1 });
    expect(spy).toHaveBeenCalledWith('[Cron] Failed to do thing for owner 2:', expect.any(Error));
    spy.mockRestore();
  });
});

describe('email counter reset rule', () => {
  const now = new Date('2026-10-13T10:00:00Z');
  it('resets when never reset or reset on another day', () => {
    expect(shouldResetEmailCounter(null, now)).toBe(true);
    expect(shouldResetEmailCounter(new Date('2026-10-12T23:59:00Z'), now)).toBe(true);
  });
  it('does not reset twice on the same UTC day', () => {
    expect(shouldResetEmailCounter(new Date('2026-10-13T00:00:01Z'), now)).toBe(false);
  });
});

describe('expired component grouping', () => {
  it('groups by owner', () => {
    const d = new Date('2026-10-01T00:00:00Z');
    const m = groupExpiredComponentsByOwner([
      { component_id: 1, component_name: 'A', expiration_date: d, tool: { tool_id: 10, tool_code: 'T1', fk_owner_id: 1 } },
      { component_id: 2, component_name: 'B', expiration_date: null, tool: { tool_id: 11, tool_code: 'T2', fk_owner_id: 1 } },
      { component_id: 3, component_name: 'C', expiration_date: d, tool: { tool_id: 12, tool_code: 'T3', fk_owner_id: 2 } },
    ]);
    expect([...m.keys()]).toEqual([1, 2]);
    expect(m.get(1)).toHaveLength(2);
    expect(m.get(1)![1].expiration_date).toBe('');
  });
});

describe('module email config rules', () => {
  const flags = { email_notifications_enabled: false, operation_email_enabled: true, system_email_enabled: false, training_email_enabled: null };
  it('maps each module to its owner-level switch (maintenance -> system_email_enabled)', () => {
    expect(isModuleFlagEnabled(flags, 'operations')).toBe(true);
    expect(isModuleFlagEnabled(flags, 'maintenance')).toBe(false);
    expect(isModuleFlagEnabled(flags, 'training')).toBe(false);
    expect(isModuleFlagEnabled(flags, 'anything-else')).toBe(false);
    expect(isModuleFlagEnabled({ ...flags, email_notifications_enabled: true }, 'anything-else')).toBe(true);
  });
  it('merges role users and specific users without duplicates or empty emails', () => {
    expect(mergeRecipientEmails(
      [{ user_id: 1, email: 'a@x.com' }, { user_id: 2, email: null }],
      [{ user_id: 1, email: 'a@x.com' }, { user_id: 3, email: 'c@x.com' }, { user_id: 4, email: null }],
    )).toEqual(['a@x.com', 'c@x.com']);
  });
});
