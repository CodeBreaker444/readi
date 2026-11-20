import 'server-only';

import type { DccCallbackResult } from '@/types/dcc-callback';
import { assertSafeCallbackUrl } from '@/lib/safe-url';

const BODY_PREVIEW = 800;

function truncateBody(text: string): string {
  const t = text.trim();
  if (t.length <= BODY_PREVIEW) return t;
  return `${t.slice(0, BODY_PREVIEW)}…`;
}

/** Network failures, timeouts, 408, 429 and 5xx are worth retrying; other 4xx are the DCC saying "no". */
export function isRetryableResult(r: DccCallbackResult): boolean {
  if (r.outcome === 'network_error') return true;
  if (r.outcome !== 'http_error') return false;
  const s = r.httpStatus ?? 0;
  return s === 408 || s === 429 || s >= 500;
}

/**
 * One attempt to POST to a DCC callback URL. Never throws.
 * - the URL is re-validated (SSRF guard) right before sending
 * - redirects are not followed (a public host could 302 to an internal one)
 * A blocked URL returns 'skipped' so it is never retried.
 */
export async function sendDccRequest(url: string, path: string, body?: unknown): Promise<DccCallbackResult> {
  try {
    await assertSafeCallbackUrl(url);
  } catch (err: any) {
    console.error(`[DCC] ${path} → blocked: ${err?.message}`);
    return { path, outcome: 'skipped', message: `Callback URL rejected: ${err?.message ?? 'unsafe address'}` };
  }

  try {
    const authUser = process.env.DCC_AUTH_USERNAME ?? 'dcc';
    const authPass = process.env.DCC_AUTH_PASSWORD ?? 'dcc';
    const basicAuth = Buffer.from(`${authUser}:${authPass}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });

    const text = await res.text().catch(() => '');
    const responseBody = text ? truncateBody(text) : undefined;

    // redirect: 'manual' surfaces 3xx as a non-ok response (or opaque status 0 in some runtimes)
    if (!res.ok) {
      console.error(`[DCC] ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
      return {
        path,
        outcome: 'http_error',
        message: res.status >= 300 && res.status < 400 ? 'DCC redirected the request (not followed)' : 'DCC returned an error',
        httpStatus: res.status,
        responseBody,
      };
    }

    console.info(`[DCC] ${path} → OK`);
    return { path, outcome: 'success', message: 'DCC accepted the callback', httpStatus: res.status, responseBody };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error(`[DCC] ${path} → fetch error: ${message}`);
    return { path, outcome: 'network_error', message: `Request failed: ${message}` };
  }
}
