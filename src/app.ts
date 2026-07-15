import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiReference } from '@scalar/hono-api-reference';
import { requestIdMiddleware } from './middleware/request-id';
import { errorHandler } from './middleware/error.middleware';
import { registerRoutes } from './routes';

export function createApp() {
  const app = new Hono();

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

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Todo Service API',
    version: '1.0.0',
    description: 'Todo service with Firebase Auth. Learning resource for full-stack development.',
  },
  servers: [{ url: 'https://api.todos.com' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } } },
        },
        responses: { '201': { description: 'User registered' }, '409': { description: 'Already exists' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } } },
        },
        responses: { '200': { description: 'User profile' }, '401': { description: 'Not registered' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Current user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Profile' } } },
    },
    '/todos': {
      get: {
        tags: ['Todos'],
        summary: 'List todos',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['completed', 'active'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'tag', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', default: '-createdAt' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Paginated todos' } },
      },
      post: {
        tags: ['Todos'], summary: 'Create todo', security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/todos/{id}': {
      get: {
        tags: ['Todos'], summary: 'Get todo', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Detail' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Todos'], summary: 'Update todo', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Todos'], summary: 'Delete todo', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/todos/batch': {
      patch: {
        tags: ['Todos'], summary: 'Batch operations', security: [{ bearerAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { action: { type: 'string', enum: ['complete-all', 'delete-completed'] } } } } },
        },
        responses: { '200': { description: 'Result' } },
      },
    },
    '/categories': {
      get: { tags: ['Categories'], summary: 'List categories', security: [{ bearerAuth: [] }], responses: { '200': { description: 'List' } } },
      post: { tags: ['Categories'], summary: 'Create (admin)', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created' } } },
    },
    '/categories/{id}': {
      patch: {
        tags: ['Categories'], summary: 'Update (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Categories'], summary: 'Delete (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/tags': {
      get: { tags: ['Tags'], summary: 'List tags', security: [{ bearerAuth: [] }], responses: { '200': { description: 'List' } } },
      post: { tags: ['Tags'], summary: 'Create (admin)', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created' } } },
    },
    '/tags/{id}': {
      patch: {
        tags: ['Tags'], summary: 'Update (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Tags'], summary: 'Delete (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/users': {
      get: { tags: ['Users'], summary: 'List users (admin)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'List' } } },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'], summary: 'Get user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Detail' } },
      },
      patch: {
        tags: ['Users'], summary: 'Update role (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Users'], summary: 'Delete user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
  },
};
