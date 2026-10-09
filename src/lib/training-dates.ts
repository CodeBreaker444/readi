import type { RefinementCtx } from 'zod';

type DateLike = string | null | undefined;

/**
 * Cross-field date checks for training records. Dates are YYYY-MM-DD strings,
 * so lexicographic comparison is chronological. Equal dates are allowed.
 */
export function refineTrainingDates(
  dates: { session?: DateLike; completion?: DateLike; expiry?: DateLike },
  keys: { completion: string; expiry: string },
  ctx: RefinementCtx
) {
  const { session, completion, expiry } = dates;

  if (session && completion && completion < session) {
    ctx.addIssue({
      code: 'custom',
      path: [keys.completion],
      message: 'Completion date cannot be before the session date',
    });
  }

  const expiryFloor = completion || session;
  if (expiry && expiryFloor && expiry < expiryFloor) {
    ctx.addIssue({
      code: 'custom',
      path: [keys.expiry],
      message: completion
        ? 'Expiry date cannot be before the completion date'
        : 'Expiry date cannot be before the session date',
    });
  }
}
