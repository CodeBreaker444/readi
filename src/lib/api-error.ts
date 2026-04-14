/**
 * Helpers for returning standardised, safe error responses from API routes.
 */

import { NextResponse } from 'next/server';
import { E, ErrorCodeKey, ErrorEntry } from './error-codes';

export type { ErrorCodeKey };

interface ApiErrorBody {
  code: 0;
  error: string;
  errorCode: string;
  errors?: Record<string, string[] | undefined>;
}


/**
 * Return a structured error response — safe for client consumption.
 * Never pass raw DB or exception messages here.
 */
export function apiError(
  entry: ErrorEntry,
  httpStatus = 400,
  fieldErrors?: Record<string, string[] | undefined>,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { code: 0, error: entry.message, errorCode: entry.code };
  if (fieldErrors) body.errors = fieldErrors;
  return NextResponse.json(body, { status: httpStatus });
}

/**
 * Log the raw cause server-side, return a safe 500 response.
 * Use in catch blocks where the original exception should never reach the client.
 */
export function internalError(entry: ErrorEntry, cause?: unknown): NextResponse<ApiErrorBody> {
  if (cause !== undefined) console.error(`[${entry.code}] ${entry.detail}`, cause);
  return apiError(entry, 500);
}

/**
 * Handle Supabase errors.
 * Inspects the error code to distinguish unique/FK violations; falls back to the supplied entry.
 * Always logs the raw Supabase error server-side.
 */
export function dbError(entry: ErrorEntry, supabaseError: unknown): NextResponse<ApiErrorBody> {
  const raw = supabaseError as { code?: string; message?: string } | null | undefined;
  console.error(`[${entry.code}] ${entry.detail} | pg:${raw?.code} — ${raw?.message}`);

  // Unique violation → DB005
  if (raw?.code === '23505') return apiError(E.DB005, 409);
  // Foreign key violation → DB006
  if (raw?.code === '23503') return apiError(E.DB006, 409);

  return apiError(entry, 500);
}

/**
 * Wrap a Zod parse failure into a 400 validation error response.
 */
export function zodError(
  entry: ErrorEntry,
  zodErr: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } },
): NextResponse<ApiErrorBody> {
  return apiError(entry, 400, zodErr.flatten().fieldErrors);
}


/** 401 — no session. */
export const unauthorized = (entry: ErrorEntry) => apiError(entry, 401);

/** 403 — authenticated but forbidden. */
export const forbidden = (entry: ErrorEntry) => apiError(entry, 403);

/** 404 — resource not found. */
export const notFound = (entry: ErrorEntry) => apiError(entry, 404);
