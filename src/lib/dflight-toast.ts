import DFlightErrorToast from '@/components/dflight/DFlightErrorToast';
import { createElement } from 'react';
import { toast } from 'sonner';

/** D-Flight error messages embed a raw JSON error body — pull out the
 * human-readable reason (result_desc/result_code_desc) instead of showing
 * the whole "request failed (400): {...}" string. */
export function formatDFlightErrorReason(message: string): string {
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return message;
  try {
    const parsed = JSON.parse(message.slice(jsonStart));
    return parsed.result_desc || parsed.result_code_desc || message;
  } catch {
    return message;
  }
}

export interface DFlightErrorDetails {
  /** Plain-text message (the whole thing when no JSON body could be parsed). */
  message: string;
  /** Short human-readable reason, same as formatDFlightErrorReason. */
  reason: string;
  httpStatus?: number;
  resultKind?: string;
  resultCode?: number | string;
  resultCodeDesc?: string;
  resultDesc?: string;
  missionId?: string;
  techVersion?: number | string;
  /** Parsed D-Flight response body, when the message carried one. */
  body?: Record<string, unknown>;
}

/** Break a D-Flight create-mission error message into its structured fields. */
export function parseDFlightError(message: string): DFlightErrorDetails {
  const details: DFlightErrorDetails = { message, reason: formatDFlightErrorReason(message) };
  const status = /HTTP (\d{3})/.exec(message);
  if (status) details.httpStatus = Number(status[1]);

  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return details;
  try {
    const body = JSON.parse(message.slice(jsonStart)) as Record<string, unknown>;
    details.body = body;
    details.resultKind = body.result_kind as string | undefined;
    details.resultCode = body.result_code as number | string | undefined;
    details.resultCodeDesc = body.result_code_desc as string | undefined;
    details.resultDesc = body.result_desc as string | undefined;
    details.missionId = body.mission_id as string | undefined;
    details.techVersion = body.tech_version as number | string | undefined;
  } catch {
    // Body truncated or not JSON — the modal falls back to the plain message.
  }
  return details;
}

/** Persistent, glowing D-Flight error toast; click "View details" for the full error in a modal. */
export function showDFlightErrorToast(title: string, message: string) {
  const details = parseDFlightError(message);
  toast.custom(
    (toastId) => createElement(DFlightErrorToast, { toastId, title, details }),
    { duration: Infinity },
  );
}
