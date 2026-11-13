import { z } from 'zod';

export const PILOT_GROUP_NAME_MAX = 100;
export const PILOT_GROUP_DESC_MAX = 500;
export const PILOT_GROUP_MEMBERS_MAX = 500;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export const pilotGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(PILOT_GROUP_NAME_MAX, `Name must be at most ${PILOT_GROUP_NAME_MAX} characters`)
    .refine((v) => !CONTROL_CHARS.test(v), 'Name contains invalid characters'),
  description: z
    .string()
    .trim()
    .max(PILOT_GROUP_DESC_MAX, `Description must be at most ${PILOT_GROUP_DESC_MAX} characters`)
    .optional(),
  memberIds: z
    .array(z.number().int().positive())
    .max(PILOT_GROUP_MEMBERS_MAX, `A group can have at most ${PILOT_GROUP_MEMBERS_MAX} members`)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate members'),
  /** Recommended for tough-weather slots. */
  isExpert: z.boolean().optional(),
});
