import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '../errors/app-error';
import { levelForStatus, logError } from '../observability/http-error-logger';

export function success<T>(c: Context, data: T, meta?: Record<string, unknown>, status: ContentfulStatusCode = 200) {
  const requestId = c.get('requestId') as string;
  return c.json(
    {
      success: true as const,
      data,
      ...(meta ? { meta } : {}),
      requestId,
    },
    status,
  );
}

export function created<T>(c: Context, data: T) {
  return success(c, data, undefined, 201);
}

export function error(c: Context, err: unknown) {
  const requestId = c.get('requestId') as string;
  const method = c.req.method;
  const path = c.req.path;

  if (err instanceof AppError) {
    logError(levelForStatus(err.status), {
      requestId,
      method,
      path,
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    });

    return c.json(
      {
        success: false as const,
        error: err.toJSON(),
        requestId,
      },
      err.status as ContentfulStatusCode,
    );
  }

  logError('error', {
    requestId,
    method,
    path,
    status: 500,
    code: 'INTERNAL_ERROR',
    message: err instanceof Error ? err.message : 'Internal server error',
    stack: err instanceof Error ? err.stack : undefined,
  });

  return c.json(
    {
      success: false as const,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      requestId,
    },
    500,
  );
}
