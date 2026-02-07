import { cookies } from 'next/headers';
import { verifyToken } from './jwt-utils';
import { Role } from './roles';

export async function getRoleFromCookie(): Promise<Role | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('readi_auth_token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.role ?? null;
}