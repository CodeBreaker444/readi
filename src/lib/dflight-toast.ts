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
