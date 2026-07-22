import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from '../platform/http/error-handler';
import { requestIdMiddleware } from '../platform/http/request-id';
import { registerRoutes } from '../routes';
import { openApiSpec } from '../openapi/spec';
import { buildContainer } from './container';
import type { AppEnv } from '../types';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', requestIdMiddleware);
  app.use('*', cors());

  // Composition root: one container per request (Workers-safe; env-bound).
  // `c.env` may be undefined in lightweight app.request() unit tests.
  app.use('*', async (c, next) => {
    c.set('container', buildContainer(c.env));
    await next();
  });

  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/openapi.json', (c) => {
    return c.json(openApiSpec);
  });

  app.get('/docs', apiReference({ theme: 'purple', spec: { url: '/openapi.json' } }));

  registerRoutes(app);
  app.onError(errorHandler);

  return app;
}
