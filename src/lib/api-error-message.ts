type FieldErrors = Record<string, string[] | undefined>;

/**
 * Pick the most specific message from an API error body: the first Zod field
 * error (`errors`), then `message`, then `error`.
 */
export function getApiErrorMessage(
  body: { message?: string; error?: string; errors?: FieldErrors } | null | undefined,
  fallback: string
): string {
  const [firstField] = formatFieldErrorList(body?.errors);
  return firstField || body?.message || body?.error || fallback;
}

/** Rewrite Zod's default wording ("Too big: expected string to have <=50 characters") into plain language. */
function humanizeZodMessage(msg: string): string {
  let m: RegExpMatchArray | null;
  if ((m = msg.match(/^Too big: expected string to have <=(\d+) characters?/))) return `must be at most ${m[1]} characters`;
  if ((m = msg.match(/^Too small: expected string to have >=(\d+) characters?/))) return m[1] === '1' ? 'is required' : `must be at least ${m[1]} characters`;
  if ((m = msg.match(/^Too big: expected (?:number|int\w*) to be <=(-?[\d.]+)/))) return `must be at most ${m[1]}`;
  if ((m = msg.match(/^Too small: expected (?:number|int\w*) to be >=(-?[\d.]+)/))) return `must be at least ${m[1]}`;
  if ((m = msg.match(/^Too small: expected (?:number|int\w*) to be >(-?[\d.]+)/))) return `must be greater than ${m[1]}`;
  if (/^Invalid input: expected int,/.test(msg)) return 'must be a whole number';
  if (/^Invalid input: expected \w+, received (undefined|null)/.test(msg)) return 'is required';
  if ((m = msg.match(/^Invalid input: expected (\w+), received \w+/))) return `must be a valid ${m[1]}`;
  if (/^Invalid option: expected one of/.test(msg)) return 'has an unsupported value';
  return msg;
}

/** "ticket_id" -> "Ticket id" */
function fieldLabel(field: string): string {
  const s = field.replace(/^fk_/, '').replace(/_ver$/, '_version').replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * One readable sentence per invalid field, e.g.
 *   ["Requirement title must be at most 255 characters", "Flight duration must be a whole number"].
 */
export function formatFieldErrorList(errors: FieldErrors | null | undefined): string[] {
  return Object.entries(errors ?? {})
    .filter(([, msgs]) => msgs && msgs.length > 0)
    .map(([field, msgs]) => {
      const label = fieldLabel(field);
      const msg = humanizeZodMessage(msgs![0]);
      if (/^(must|is|has)\b/.test(msg)) return `${label} ${msg}`;
      // Custom messages like "Client name is required" already name the field.
      if (msg.toLowerCase().includes(label.toLowerCase())) return msg;
      return `${label}: ${msg}`;
    });
}

export function formatFieldErrors(errors: FieldErrors | null | undefined): string {
  return formatFieldErrorList(errors).join('; ');
}

/**
 * Mutates an API error body in place so toast handlers that read `message` or `error`
 * both surface the validation detail users need to fix their input. The original
 * title ("Validation failed") is kept in `errorTitle`.
 */
export function enrichApiErrorBody(body: unknown): void {
  if (!body || typeof body !== 'object') return;
  const b = body as { message?: string; error?: string; errorTitle?: string; errors?: FieldErrors };
  const detail = formatFieldErrors(b.errors);
  if (!detail) {
    // Plain apiError() bodies carry only `error`; many handlers read `message`.
    if (!b.message && b.error) b.message = b.error;
    return;
  }
  b.errorTitle = b.error;
  b.error = detail;
  b.message = b.message || detail;
}
