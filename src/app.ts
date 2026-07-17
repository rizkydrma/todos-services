import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error.middleware';
import { requestIdMiddleware } from './middleware/request-id';
import { registerRoutes } from './routes';
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

/** Example payloads used in OpenAPI / Scalar docs */
const exampleUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'budi@yahoo.com',
  name: 'Budi Santoso',
  role: 'user',
  firebaseUid: null,
  createdAt: '2026-07-17T10:00:00.000Z',
  updatedAt: '2026-07-17T10:00:00.000Z',
};

const exampleSession = {
  user: exampleUser,
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoiYWNjZXNzIn0.example',
  refreshToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoicmVmcmVzaCJ9.example',
  expiresIn: 900,
};

const exampleError = {
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Invalid credentials',
  },
  requestId: 'req_abc123',
};

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Todo Service API',
    version: '1.0.0',
    description:
      'Todo service with email/password + Google login. Session uses access/refresh JWT. Learning resource for full-stack development.',
  },
  servers: [{ url: 'https://api.todos.com' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      PublicUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          firebaseUid: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
      },
      AuthSession: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/PublicUser' },
          accessToken: { type: 'string', description: 'JWT access token (Bearer)' },
          refreshToken: { type: 'string', description: 'JWT refresh token' },
          expiresIn: {
            type: 'integer',
            description: 'Access token TTL in seconds',
            example: 900,
          },
        },
        required: ['user', 'accessToken', 'refreshToken', 'expiresIn'],
      },
      AuthSessionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/AuthSession' },
          requestId: { type: 'string' },
        },
      },
      PublicUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/PublicUser' },
          requestId: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
            required: ['code', 'message'],
          },
          requestId: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register with email and password',
        description: 'Creates a user, hashes password into D1, returns session tokens.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Budi Santoso' },
                  email: { type: 'string', format: 'email', example: 'budi@yahoo.com' },
                  password: { type: 'string', minLength: 6, example: 'rahasia123' },
                },
                required: ['name', 'email', 'password'],
              },
              example: {
                name: 'Budi Santoso',
                email: 'budi@yahoo.com',
                password: 'rahasia123',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSessionResponse' },
                example: {
                  success: true,
                  data: exampleSession,
                  requestId: 'req_abc123',
                },
              },
            },
          },
          '409': {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: { code: 'CONFLICT', message: 'Email already registered' },
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'budi@yahoo.com' },
                  password: { type: 'string', example: 'rahasia123' },
                },
                required: ['email', 'password'],
              },
              example: { email: 'budi@yahoo.com', password: 'rahasia123' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged in',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSessionResponse' },
                example: {
                  success: true,
                  data: exampleSession,
                  requestId: 'req_abc123',
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: exampleError,
              },
            },
          },
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Login with Google idToken',
        description: 'Verifies Firebase/Google ID token. Auto-registers if user is new.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  idToken: {
                    type: 'string',
                    description: 'Firebase ID token from Google Sign-In',
                    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...google-id-token',
                  },
                },
                required: ['idToken'],
              },
              example: { idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...google-id-token' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged in (same shape as email/password)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSessionResponse' },
                example: {
                  success: true,
                  data: {
                    ...exampleSession,
                    user: {
                      ...exampleUser,
                      email: 'budi@gmail.com',
                      firebaseUid: 'firebase-uid-abc',
                    },
                  },
                  requestId: 'req_abc123',
                },
              },
            },
          },
          '401': {
            description: 'Invalid Google token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate access/refresh tokens',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refreshToken: { type: 'string' } },
                required: ['refreshToken'],
              },
              example: { refreshToken: exampleSession.refreshToken },
            },
          },
        },
        responses: {
          '200': {
            description: 'New token pair (old refresh revoked)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSessionResponse' },
                example: {
                  success: true,
                  data: exampleSession,
                  requestId: 'req_abc123',
                },
              },
            },
          },
          '401': {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke refresh token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refreshToken: { type: 'string' } },
                required: ['refreshToken'],
              },
              example: { refreshToken: exampleSession.refreshToken },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged out (idempotent)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: { ok: { type: 'boolean' } },
                    },
                    requestId: { type: 'string' },
                  },
                },
                example: {
                  success: true,
                  data: { ok: true },
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile (no passwordHash)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PublicUserResponse' },
                example: {
                  success: true,
                  data: exampleUser,
                  requestId: 'req_abc123',
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid access token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  error: {
                    code: 'UNAUTHORIZED',
                    message: 'Missing or invalid Authorization header',
                  },
                  requestId: 'req_abc123',
                },
              },
            },
          },
        },
      },
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
        tags: ['Todos'],
        summary: 'Create todo',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/todos/{id}': {
      get: {
        tags: ['Todos'],
        summary: 'Get todo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Detail' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Todos'],
        summary: 'Update todo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Todos'],
        summary: 'Delete todo',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/todos/batch': {
      patch: {
        tags: ['Todos'],
        summary: 'Batch operations',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { action: { type: 'string', enum: ['complete-all', 'delete-completed'] } },
              },
            },
          },
        },
        responses: { '200': { description: 'Result' } },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List' } },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/categories/{id}': {
      patch: {
        tags: ['Categories'],
        summary: 'Update (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/tags': {
      get: {
        tags: ['Tags'],
        summary: 'List tags',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List' } },
      },
      post: {
        tags: ['Tags'],
        summary: 'Create (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/tags/{id}': {
      patch: {
        tags: ['Tags'],
        summary: 'Update (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Tags'],
        summary: 'Delete (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Detail' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update role (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
  },
};
