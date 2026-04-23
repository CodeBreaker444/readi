import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Role, RoutePermissionEntry, roleHasPermission } from "./auth/roles";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decode the payload of a JWT without verifying the signature.
 * Used only for permission checks in middleware (UX layer).
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return payload.exp < Math.floor(Date.now() / 1000)
}

export function decodeJwtRole(token: string): Role | null {
  const payload = decodeJwtPayload(token)
  return (payload?.role as Role) ?? null
}

export function hasRoutePermission(role: Role, entry: RoutePermissionEntry): boolean {
  if (role === 'SUPERADMIN' || role === 'ADMIN') return true
  const perms = Array.isArray(entry) ? entry : [entry]
  return perms.some((p) => roleHasPermission(role, p))
}
