type LogLevel = 'info' | 'warn' | 'error';

export type ErrorLogPayload = {
  requestId: string;
  method?: string;
  path?: string;
  status: number;
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
};

/**
 * Structured logs for Cloudflare Workers (wrangler tail + Observability).
 * Logs all client/server failures (any 4xx / 5xx), not only 400 / 500.
 *
 * Filter examples:
 *   wrangler tail --search 'http_error'          # all tracked HTTP errors
 *   wrangler tail --search '"level":"warn"'      # all 4xx
 *   wrangler tail --search '"level":"error"'     # all 5xx
 *   wrangler tail --search 'UNAUTHORIZED'        # specific code
 */
export function logError(level: LogLevel, payload: ErrorLogPayload): void {
  const entry = {
    level,
    type: 'http_error',
    statusClass: statusClass(payload.status),
    ...payload,
    ts: new Date().toISOString(),
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Any 5xx → error, any 4xx → warn (401, 403, 404, 409, 429, …). */
export function levelForStatus(status: number): LogLevel {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

export function statusClass(status: number): '4xx' | '5xx' | 'other' {
  if (status >= 500 && status < 600) return '5xx';
  if (status >= 400 && status < 500) return '4xx';
  return 'other';
}
