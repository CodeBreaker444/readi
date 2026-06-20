import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET_KEY ?? 'test-jwt-secret-do-not-use-in-production';

// ─── Cookie store ──────────────────────────────────────────────────────────

export function getCookieStore(): Map<string, string> {
  return (global as any).__cookieStore as Map<string, string>;
}

export function clearAllCookies(): void {
  getCookieStore().clear();
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

export interface TestUser {
  userId: number;
  email: string;
  username: string;
  role: string;
  ownerId?: number;
}

/**
 * Inject a signed JWT into the cookie store so subsequent route handler calls
 * in the same test will be authenticated as this user.
 * Uses jsonwebtoken directly to avoid importing @/backend/config/env.
 */
export function loginAs(user: TestUser): string {
  const token = jwt.sign(
    {
      sub: String(user.userId),
      email: user.email,
      username: user.username,
      role: user.role,
      droneAtcEnabled: user.role === 'SUPERADMIN',
    },
    JWT_SECRET,
    { expiresIn: '1h', issuer: 'readi-app' }
  );
  getCookieStore().set('readi_auth_token', token);
  return token;
}

export function clearSession(): void {
  getCookieStore().delete('readi_auth_token');
}

// ─── Request helpers ─────────────────────────────────────────────────────────

export function makeRequest(
  url: string,
  options: { method?: string; body?: object } = {}
): NextRequest {
  const { method = 'GET', body } = options;
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export function makeFormDataRequest(
  url: string,
  fields: Record<string, string | Blob>,
  method = 'POST'
): NextRequest {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof Blob) {
      fd.append(key, value, (value as File).name ?? key);
    } else {
      fd.append(key, value);
    }
  }
  return new NextRequest(`http://localhost${url}`, { method, body: fd });
}

export async function parseJson<T = any>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

// ─── Session mock builder ────────────────────────────────────────────────────

/** Build a mock SessionUser object for use with mockGetUserSession. */
export function makeSessionUser(overrides: Partial<TestUser> & { role?: string } = {}): any {
  return {
    userId: overrides.userId ?? 1,
    id: 'auth-user-id-test',
    ownerId: overrides.ownerId ?? 10,
    email: overrides.email ?? 'admin@test.com',
    fullname: 'Test Admin',
    username: overrides.username ?? 'testadmin',
    role: overrides.role ?? 'ADMIN',
    clientId: 0,
    userActive: 'Y' as const,
    droneAtcEnabled: (overrides.role ?? 'ADMIN') === 'SUPERADMIN',
    companyEasaCode: null,
    ownerName: 'Test Company',
  };
}

export function makeSession(userOverrides: Parameters<typeof makeSessionUser>[0] = {}): any {
  return { user: makeSessionUser(userOverrides) };
}

// ─── next/headers mock factory ────────────────────────────────────────────────
// Import this value in jest.mock() factories — it returns a fresh mock cookies()
// that reads/writes the global __cookieStore.

export function makeCookiesMock() {
  return {
    cookies: jest.fn().mockImplementation(async () => {
      const store = (global as any).__cookieStore as Map<string, string>;
      return {
        get:    (name: string) =>
                  store.has(name) ? { name, value: store.get(name)! } : undefined,
        set:    (name: string, value: string, opts?: any) => {
                  if (!value || opts?.maxAge === 0) store.delete(name);
                  else store.set(name, value);
                },
        delete: (name: string) => store.delete(name),
        has:    (name: string) => store.has(name),
        getAll: () => Array.from(store.entries()).map(([n, v]) => ({ name: n, value: v })),
      };
    }),
    headers: jest.fn().mockImplementation(async () => new Headers()),
  };
}
