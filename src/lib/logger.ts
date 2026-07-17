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

const MAX_STACK_FRAMES = 8;

/**
 * Structured logs for Cloudflare Workers (wrangler tail + Observability).
 * Pretty multi-line JSON so terminals stay readable; stack is truncated frames.
 *
 * Filter examples:
 *   wrangler tail --search 'http_error'          # all tracked HTTP errors
 *   wrangler tail --search '"level":"error"'     # all 5xx
 *   wrangler tail --search 'UNAUTHORIZED'        # specific code
 */
export function logError(level: LogLevel, payload: ErrorLogPayload): void {
  const { stack, ...rest } = payload;

  const entry: Record<string, unknown> = {
    level,
    type: 'http_error',
    statusClass: statusClass(payload.status),
    ...rest,
    ts: new Date().toISOString(),
  };

  if (stack) {
    entry.stack = formatStack(stack);
  }

  // Pretty-print: readable in wrangler tail / CF logs without one giant line.
  const body = JSON.stringify(entry, null, 2);
  const summary = formatSummary(level, payload);
  const line = `${summary}\n${body}`;

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

/** One-line header so you can scan tail quickly. */
export function formatSummary(level: LogLevel, payload: ErrorLogPayload): string {
  const method = payload.method ?? '-';
  const path = payload.path ?? '-';
  return `[${level}] ${method} ${path} ${payload.status} ${payload.code}`;
}

/** Split stack into frames and keep the top ones (drop noise). */
export function formatStack(stack: string, maxFrames = MAX_STACK_FRAMES): string[] {
  return stack
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(0, maxFrames);
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
