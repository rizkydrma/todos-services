import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { levelForStatus, logError } from '../observability/http-error-logger';
import type { AppEnv } from '../../types';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  const method = c.req.method;
  const path = c.req.path;

  if (err instanceof ZodError) {
    const status = 400;
    logError(levelForStatus(status), {
      requestId,
      method,
      path,
      status,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.errors,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.errors,
        },
        requestId,
      },
      status,
    );
  }

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
        success: false,
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
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      requestId,
    },
    500,
  );
};
