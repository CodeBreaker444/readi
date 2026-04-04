/**
 * Token limits for the AI chat feature.
 * Platform limit is set to Groq free-tier daily quota for llama-3.3-70b-versatile.
 */
export const TOKEN_LIMITS = {
  /** Max tokens a single user may consume per day */
  PER_USER_DAILY: 25_000,

  /** Groq free-tier hard ceiling — shared across the entire platform */
  PLATFORM_DAILY: 500_000,
} as const;

export const GROQ_MODEL = 'llama-3.3-70b-versatile';
