import { createMiddleware } from 'hono/factory';

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || `req_${crypto.randomUUID()}`;
  c.set('requestId', requestId);
  c.res.headers.set('X-Request-Id', requestId);
  await next();
});
