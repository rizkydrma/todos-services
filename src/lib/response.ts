import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from './errors';

export function success<T>(c: Context, data: T, meta?: Record<string, unknown>, status: ContentfulStatusCode = 200) {
  const requestId = c.get('requestId') as string;
  return c.json({
    success: true as const,
    data,
    ...(meta ? { meta } : {}),
    requestId,
  }, status);
}

export function created<T>(c: Context, data: T) {
  return success(c, data, undefined, 201);
}

export function error(c: Context, err: unknown) {
  const requestId = c.get('requestId') as string;

  if (err instanceof AppError) {
    return c.json({
      success: false as const,
      error: err.toJSON(),
      requestId,
    }, err.status as ContentfulStatusCode);
  }

  console.error(`[${requestId}] Unexpected error:`, err);
  return c.json({
    success: false as const,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    requestId,
  }, 500);
}
