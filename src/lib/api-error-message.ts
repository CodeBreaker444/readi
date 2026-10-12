/**
 * Pick the most specific message from an API error body: the first Zod field
 * error (`errors`), then `message`, then `error`.
 */
export function getApiErrorMessage(
  body: { message?: string; error?: string; errors?: Record<string, string[] | undefined> } | null | undefined,
  fallback: string
): string {
  const fieldMessage = Object.values(body?.errors ?? {}).flat().find(Boolean);
  return fieldMessage || body?.message || body?.error || fallback;
}
