import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = (c.get('requestId') as string) || 'unknown';

  if (err instanceof ZodError) {
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
      400,
    );
  }

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: err.toJSON(),
        requestId,
      },
      err.status as ContentfulStatusCode,
    );
  }

  console.error(`[${requestId}] Unhandled error:`, err);
  return c.json(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      requestId,
    },
    500,
  );
};
