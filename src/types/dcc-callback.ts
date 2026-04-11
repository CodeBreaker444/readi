/** Result of an outbound HTTP call to the owner-configured DCC server. */
export type DccCallbackResult = {
  path: string;
  outcome: 'skipped' | 'success' | 'http_error' | 'network_error';
  message: string;
  httpStatus?: number;
  /** Truncated response text from DCC (success or error body). */
  responseBody?: string;
};
