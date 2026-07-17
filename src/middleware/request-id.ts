import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

export const requestIdMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || `req_${crypto.randomUUID()}`;
  c.set('requestId', requestId);
  c.res.headers.set('X-Request-Id', requestId);
  await next();
});
