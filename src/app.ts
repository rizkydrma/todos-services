import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error.middleware';
import { requestIdMiddleware } from './middleware/request-id';
import { registerRoutes } from './routes';
import { openApiSpec } from './openapi/spec';
import type { AppEnv } from './types';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', requestIdMiddleware);
  app.use('*', cors());

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
