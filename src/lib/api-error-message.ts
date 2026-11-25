import i18n from 'i18next';

type FieldErrors = Record<string, string[] | undefined>;

type ApiBody = {
  message?: string;
  error?: string;
  errorCode?: string;
  errorTitle?: string;
  /** English text as sent by the server, kept when `message` was localized (for string comparisons). */
  messageOriginal?: string;
  errorOriginal?: string;
  errors?: FieldErrors;
};

/**
 * Translate a server-supplied message into the language the user has selected *right now*.
 * Lookup order: `apiErrors.<errorCode>` -> `apiMessages[<exact English text>]` -> the text unchanged.
 */
export function localizeApiText(text: string | undefined, errorCode?: string): string | undefined {
  if (errorCode) {
    const key = `apiErrors.${errorCode}`;
    if (i18n.isInitialized && i18n.exists(key)) return i18n.t(key);
  }
  if (text && i18n.isInitialized) {
    const bundle = i18n.getResourceBundle(i18n.resolvedLanguage || i18n.language, 'translation') as
      | { apiMessages?: Record<string, string> }
      | undefined;
    const hit = bundle?.apiMessages?.[text];
    if (typeof hit === 'string') return hit;
  }
  return text;
}

/**
 * Translate a fixed English UI/API string into the user's currently selected language, falling back
 * to the English text. Supports {{placeholders}}. Use for toast text that has no component-level t().
 */
export function localizeText(text: string, params?: Record<string, string | number>): string {
  let out = localizeApiText(text) ?? text;
  if (params) for (const [k, v] of Object.entries(params)) out = out.split('{{' + k + '}}').join(String(v));
  return out;
}

/**
 * Localize `error` / `message` of an API response body in place. The original English
 * text is preserved in `errorOriginal` / `messageOriginal`.
 */
export function localizeApiBody(body: unknown): void {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return;
  if (Object.getPrototypeOf(body) !== Object.prototype) return; // skip Blob / ArrayBuffer / class instances
  const b = body as ApiBody;
  const originalError = typeof b.error === 'string' ? b.error : undefined;
  const originalMessage = typeof b.message === 'string' ? b.message : undefined;

  const error = localizeApiText(originalError, b.errorCode);
  // `message` mirrors `error` on error bodies; otherwise translate it by its own text.
  const message =
    b.errorCode && originalMessage !== undefined && originalMessage === originalError
      ? error
      : localizeApiText(originalMessage);

  if (originalError !== undefined && error !== originalError) {
    b.errorOriginal = originalError;
    b.error = error;
  }
  if (originalMessage !== undefined && message !== originalMessage) {
    b.messageOriginal = originalMessage;
    b.message = message;
  }
}

/**
 * Pick the most specific message from an API error body: the first Zod field
 * error (`errors`), then `message`, then `error`.
 */
export function getApiErrorMessage(
  body: { message?: string; error?: string; errorCode?: string; errors?: FieldErrors } | null | undefined,
  fallback: string
): string {
  const [firstField] = formatFieldErrorList(body?.errors);
  return (
    firstField ||
    localizeApiText(body?.message, body?.errorCode) ||
    localizeApiText(body?.error, body?.errorCode) ||
    fallback
  );
}

const vt = (key: string, english: string, opts: Record<string, string | number> = {}) =>
  i18n.isInitialized ? i18n.t(`apiValidation.${key}`, { defaultValue: english, ...opts }) : english;

/**
 * Rewrite Zod's default wording ("Too big: expected string to have <=50 characters") into plain,
 * localized language. `phrase` is true when the result is a predicate to append to the field label.
 */
function humanizeZodMessage(msg: string): { text: string; phrase: boolean } {
  let m: RegExpMatchArray | null;
  const p = (text: string) => ({ text, phrase: true });
  if ((m = msg.match(/^Too big: expected string to have <=(\d+) characters?/))) return p(vt('maxChars', `must be at most ${m[1]} characters`, { n: m[1] }));
  if ((m = msg.match(/^Too small: expected string to have >=(\d+) characters?/))) return p(m[1] === '1' ? vt('required', 'is required') : vt('minChars', `must be at least ${m[1]} characters`, { n: m[1] }));
  if ((m = msg.match(/^Too big: expected (?:number|int\w*) to be <=(-?[\d.]+)/))) return p(vt('maxNum', `must be at most ${m[1]}`, { n: m[1] }));
  if ((m = msg.match(/^Too small: expected (?:number|int\w*) to be >=(-?[\d.]+)/))) return p(vt('minNum', `must be at least ${m[1]}`, { n: m[1] }));
  if ((m = msg.match(/^Too small: expected (?:number|int\w*) to be >(-?[\d.]+)/))) return p(vt('gtNum', `must be greater than ${m[1]}`, { n: m[1] }));
  if (/^Invalid input: expected int,/.test(msg)) return p(vt('wholeNumber', 'must be a whole number'));
  if (/^Invalid input: expected \w+, received (undefined|null)/.test(msg)) return p(vt('required', 'is required'));
  if ((m = msg.match(/^Invalid input: expected (\w+), received \w+/))) return p(vt('validType', `must be a valid ${m[1]}`, { type: m[1] }));
  if (/^Invalid option: expected one of/.test(msg)) return p(vt('unsupported', 'has an unsupported value'));
  return { text: localizeApiText(msg) ?? msg, phrase: false };
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
      const { text, phrase } = humanizeZodMessage(msgs![0]);
      if (phrase) return `${label} ${text}`;
      // Custom messages like "Client name is required" already name the field.
      if (text.toLowerCase().includes(label.toLowerCase())) return text;
      return `${label}: ${text}`;
    });
}

export function formatFieldErrors(errors: FieldErrors | null | undefined): string {
  return formatFieldErrorList(errors).join('; ');
}

/**
 * Mutates an API error body in place so toast handlers that read `message` or `error`
 * both surface the validation detail users need to fix their input, in the user's
 * currently selected language. The original title ("Validation failed") is kept in `errorTitle`.
 */
export function enrichApiErrorBody(body: unknown): void {
  if (!body || typeof body !== 'object') return;
  localizeApiBody(body);
  const b = body as ApiBody;
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
