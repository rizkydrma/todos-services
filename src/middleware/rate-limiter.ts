import { createMiddleware } from 'hono/factory';
import { AppError } from '../lib/errors';

const store = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter = createMiddleware(async (c, next) => {
  const key = c.req.header('CF-Connecting-IP') || 'unknown';
  const windowMs = 60_000;
  const maxRequests = 10;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  entry.count++;
  if (entry.count > maxRequests) {
    throw AppError.tooManyRequests('Rate limit exceeded. Try again later.');
  }

  await next();
});
