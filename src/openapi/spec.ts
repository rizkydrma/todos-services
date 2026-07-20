/**
 * OpenAPI 3.0 spec with full schemas + examples so FE can rely on Scalar /docs.
 */

const exampleUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'budi@yahoo.com',
  name: 'Budi Santoso',
  role: 'user' as const,
  firebaseUid: null as string | null,
  emailVerified: true,
  avatarUrl: null as string | null,
  createdAt: '2026-07-17T10:00:00.000Z',
  updatedAt: '2026-07-17T10:00:00.000Z',
};

const examplePendingVerification = {
  requiresEmailVerification: true as const,
  email: 'budi@yahoo.com',
};

const exampleCategory = {
  id: 'cat-1111-1111-1111-111111111111',
  name: 'Work',
  color: '#3B82F6',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const exampleTag = {
  id: 'tag-2222-2222-2222-222222222222',
  name: 'urgent',
  color: '#EF4444',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const exampleTodo = {
  id: 'todo-3333-3333-3333-333333333333',
  userId: exampleUser.id,
  title: 'Ship auth docs',
  description: 'OpenAPI response examples for FE',
  completed: false,
  priority: 'high' as const,
  dueDate: '2026-07-20T00:00:00.000Z',
  categoryId: exampleCategory.id,
  createdAt: '2026-07-17T10:00:00.000Z',
  updatedAt: '2026-07-17T10:00:00.000Z',
};

const exampleTodoWithRelations = {
  ...exampleTodo,
  category: exampleCategory,
  tags: [exampleTag],
};

const exampleSession = {
  user: exampleUser,
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMCIsInR5cGUiOiJhY2Nlc3MifQ.example',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMCIsInR5cGUiOiJyZWZyZXNoIn0.example',
  expiresIn: 900,
};

const exampleMeta = {
  page: 1,
  limit: 20,
  total: 42,
  totalPages: 3,
};

function ok<T>(data: T, meta?: typeof exampleMeta) {
  return {
    success: true as const,
    data,
    ...(meta ? { meta } : {}),
    requestId: 'req_abc123',
  };
}

function err(code: string, message: string) {
  return {
    success: false as const,
    error: { code, message },
    requestId: 'req_abc123',
  };
}

const jsonContent = (schema: object, example: unknown) => ({
  content: {
    'application/json': {
      schema,
      example,
    },
  },
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Todo Service API',
    version: '1.0.0',
    description:
      'Todo service with email/password + Google login. Email/password registration requires OTP verification before session. Session uses access/refresh JWT. Full response schemas for FE clients.',
  },
  servers: [
    { url: 'https://todo-service.rizky-darmarazak.workers.dev', description: 'Production' },
    { url: 'http://localhost:8787', description: 'Local' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from /auth/login, /auth/verify-email, or /auth/google',
      },
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
          emailVerified: { type: 'boolean', description: 'Derived from email_verified_at' },
          avatarUrl: {
            type: 'string',
            nullable: true,
            description: 'Public URL from R2 avatar_key; null if no avatar (never defaulted from Google)',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'email',
          'name',
          'role',
          'firebaseUid',
          'emailVerified',
          'avatarUrl',
          'createdAt',
          'updatedAt',
        ],
      },
      AuthSession: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/PublicUser' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer', example: 900, description: 'Access TTL seconds' },
        },
        required: ['user', 'accessToken', 'refreshToken', 'expiresIn'],
      },
      RegisterPendingVerification: {
        type: 'object',
        properties: {
          requiresEmailVerification: { type: 'boolean', enum: [true] },
          email: { type: 'string', format: 'email' },
        },
        required: ['requiresEmailVerification', 'email'],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          color: { type: 'string', nullable: true, example: '#3B82F6' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'color', 'createdAt', 'updatedAt'],
      },
      Tag: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          color: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'color', 'createdAt', 'updatedAt'],
      },
      Todo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          completed: { type: 'boolean' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          categoryId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'userId',
          'title',
          'description',
          'completed',
          'priority',
          'dueDate',
          'categoryId',
          'createdAt',
          'updatedAt',
        ],
      },
      TodoWithRelations: {
        allOf: [
          { $ref: '#/components/schemas/Todo' },
          {
            type: 'object',
            properties: {
              category: { oneOf: [{ $ref: '#/components/schemas/Category' }, { type: 'null' }] },
              tags: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
            },
            required: ['category', 'tags'],
          },
        ],
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 },
        },
        required: ['page', 'limit', 'total', 'totalPages'],
      },
      ErrorBody: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            enum: [
              'VALIDATION_ERROR',
              'UNAUTHORIZED',
              'FORBIDDEN',
              'NOT_FOUND',
              'CONFLICT',
              'TOO_MANY_REQUESTS',
              'INTERNAL_ERROR',
              'EMAIL_NOT_VERIFIED',
              'INVALID_OTP',
              'OTP_EXPIRED',
              'OTP_MAX_ATTEMPTS',
              'RATE_LIMITED',
              'EMAIL_REGISTERED_USE_PASSWORD',
              'IDENTITY_CONFLICT',
              'EMAIL_ALREADY_REGISTERED',
            ],
          },
          message: { type: 'string' },
          details: {},
        },
        required: ['code', 'message'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: { $ref: '#/components/schemas/ErrorBody' },
          requestId: { type: 'string' },
        },
        required: ['success', 'error', 'requestId'],
      },
      AuthSessionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/AuthSession' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      RegisterPendingVerificationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/RegisterPendingVerification' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      PublicUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/PublicUser' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      TodoListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'array', items: { $ref: '#/components/schemas/TodoWithRelations' } },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'meta', 'requestId'],
      },
      TodoDetailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/TodoWithRelations' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      TodoResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/Todo' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      CategoryListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      CategoryResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/Category' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      TagListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      TagResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/Tag' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      UserListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { type: 'array', items: { $ref: '#/components/schemas/PublicUser' } },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'meta', 'requestId'],
      },
      BatchResultResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: { affected: { type: 'integer', example: 5 } },
            required: ['affected'],
          },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
      DeletedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: {
            type: 'object',
            properties: { deleted: { type: 'boolean', example: true } },
            required: ['deleted'],
          },
          requestId: { type: 'string' },
        },
        required: ['success', 'data', 'requestId'],
      },
    },
  },
  paths: {
    // ── Auth ──
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register with email and password',
        description:
          'Creates an unverified account and sends a 6-digit OTP email. Does **not** return session tokens — call `/auth/verify-email` after receiving the code.',
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
              example: { name: 'Budi Santoso', email: 'budi@yahoo.com', password: 'rahasia123' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registered — email verification required',
            ...jsonContent(
              { $ref: '#/components/schemas/RegisterPendingVerificationResponse' },
              ok(examplePendingVerification),
            ),
          },
          '409': {
            description: 'Email already registered',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('EMAIL_ALREADY_REGISTERED', 'Email already registered'),
            ),
          },
          '400': {
            description: 'Validation error',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('VALIDATION_ERROR', 'Validation failed'),
            ),
          },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email with OTP code',
        description: 'Consumes the active verification challenge, marks the user verified, and issues an auth session.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'budi@yahoo.com' },
                  code: {
                    type: 'string',
                    pattern: '^\\d{6}$',
                    example: '123456',
                    description: '6-digit OTP from email',
                  },
                },
                required: ['email', 'code'],
              },
              example: { email: 'budi@yahoo.com', code: '123456' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified — session issued',
            ...jsonContent({ $ref: '#/components/schemas/AuthSessionResponse' }, ok(exampleSession)),
          },
          '401': {
            description: 'Invalid or expired OTP',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('INVALID_OTP', 'Invalid or expired code'),
            ),
          },
          '429': {
            description: 'Too many wrong OTP attempts',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('OTP_MAX_ATTEMPTS', 'Too many attempts'),
            ),
          },
          '400': {
            description: 'Validation error',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('VALIDATION_ERROR', 'Validation failed'),
            ),
          },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend email verification OTP',
        description:
          'Invalidates prior challenges and sends a new OTP when the account is unverified. Always returns `{ ok: true }` for unknown/already-verified emails (no enumeration). Rate limited: 60s cooldown, max 5/hour per email.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'budi@yahoo.com' },
                },
                required: ['email'],
              },
              example: { email: 'budi@yahoo.com' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Accepted (generic success)',
            ...jsonContent(
              {
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
              ok({ ok: true }),
            ),
          },
          '429': {
            description: 'Resend rate limited',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('RATE_LIMITED', 'Too many requests')),
          },
          '400': {
            description: 'Validation error',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('VALIDATION_ERROR', 'Validation failed'),
            ),
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        description: 'Requires email to be verified. Unverified accounts get 403 EMAIL_NOT_VERIFIED (no tokens).',
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
            ...jsonContent({ $ref: '#/components/schemas/AuthSessionResponse' }, ok(exampleSession)),
          },
          '401': {
            description: 'Invalid credentials',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('UNAUTHORIZED', 'Invalid credentials')),
          },
          '403': {
            description: 'Email not verified',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('EMAIL_NOT_VERIFIED', 'Email not verified'),
            ),
          },
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Login with Google idToken',
        description:
          'Requires Firebase `email_verified` claim. Does not auto-link password accounts by email (409 EMAIL_REGISTERED_USE_PASSWORD).',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { idToken: { type: 'string' } },
                required: ['idToken'],
              },
              example: { idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...google-id-token' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged in (auto-register if new)',
            ...jsonContent(
              { $ref: '#/components/schemas/AuthSessionResponse' },
              ok({
                ...exampleSession,
                user: {
                  ...exampleUser,
                  email: 'budi@gmail.com',
                  firebaseUid: 'firebase-uid-abc',
                  emailVerified: true,
                },
              }),
            ),
          },
          '401': {
            description: 'Invalid Google token or email not verified on Google',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('UNAUTHORIZED', 'Invalid or expired token'),
            ),
          },
          '409': {
            description: 'Email already owned by password account or identity conflict',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('EMAIL_REGISTERED_USE_PASSWORD', 'Email already registered; use password login'),
            ),
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
            description: 'New token pair',
            ...jsonContent({ $ref: '#/components/schemas/AuthSessionResponse' }, ok(exampleSession)),
          },
          '401': {
            description: 'Invalid refresh token',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('UNAUTHORIZED', 'Invalid or expired refresh token'),
            ),
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
            description: 'Logged out',
            ...jsonContent(
              {
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
              ok({ ok: true }),
            ),
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
            description: 'Profile',
            ...jsonContent({ $ref: '#/components/schemas/PublicUserResponse' }, ok(exampleUser)),
          },
          '401': {
            description: 'Unauthorized',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('UNAUTHORIZED', 'Missing or invalid Authorization header'),
            ),
          },
        },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update profile (name and/or avatarKey)',
        description:
          'Set avatar after uploading via POST /uploads/get-single-url (or multipart). Pass avatarKey from the upload response; null clears avatar.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100 },
                  avatarKey: {
                    type: 'string',
                    nullable: true,
                    description: 'R2 object key from /uploads; null clears avatar',
                  },
                },
              },
              example: {
                name: 'Budi Updated',
                avatarKey: 'uploads/1712345678_avatar.png',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated profile',
            ...jsonContent(
              { $ref: '#/components/schemas/PublicUserResponse' },
              ok({
                ...exampleUser,
                name: 'Budi Updated',
                avatarUrl: 'https://cdn.example.com/uploads/1712345678_avatar.png',
              }),
            ),
          },
          '401': {
            description: 'Unauthorized',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('UNAUTHORIZED', 'Missing or invalid Authorization header'),
            ),
          },
        },
      },
    },

    // ── Uploads (general R2 presign) ──
    '/uploads/get-single-url': {
      post: {
        tags: ['Uploads'],
        summary: 'Presigned PUT URL for single file (≤ 50MB)',
        description:
          'Client PUTs binary to uploadUrl, then may store key/fileUrl on a domain resource (e.g. PATCH /auth/me avatarKey).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fileName: { type: 'string' },
                  fileType: { type: 'string' },
                  folder: { type: 'string', default: 'uploads' },
                  fileSize: { type: 'integer' },
                },
                required: ['fileName', 'fileType', 'fileSize'],
              },
              example: {
                fileName: 'foto-proyek.jpg',
                fileType: 'image/jpeg',
                folder: 'avatars',
                fileSize: 1048576,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Presigned upload URL',
            ...jsonContent(
              {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      uploadUrl: { type: 'string' },
                      fileUrl: { type: 'string' },
                      key: { type: 'string' },
                      expiresIn: { type: 'integer' },
                    },
                  },
                  requestId: { type: 'string' },
                },
              },
              ok({
                uploadUrl: 'https://bucket.account.r2.cloudflarestorage.com/avatars/…?X-Amz-…',
                fileUrl: 'https://cdn.example.com/avatars/1712345678_foto-proyek.jpg',
                key: 'avatars/1712345678_foto-proyek.jpg',
                expiresIn: 3600,
              }),
            ),
          },
        },
      },
    },
    '/uploads/init-multipart': {
      post: {
        tags: ['Uploads'],
        summary: 'Start multipart upload (files > 50MB, up to 20GB)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fileName: { type: 'string' },
                  fileType: { type: 'string' },
                  folder: { type: 'string' },
                  fileSize: { type: 'integer' },
                },
                required: ['fileName', 'fileType', 'fileSize'],
              },
              example: {
                fileName: 'video-besar.mp4',
                fileType: 'video/mp4',
                folder: 'uploads',
                fileSize: 524288000,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Multipart session',
            ...jsonContent(
              {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      uploadId: { type: 'string' },
                      key: { type: 'string' },
                    },
                  },
                  requestId: { type: 'string' },
                },
              },
              ok({
                uploadId: 'YzBmNTZlN2EtYWRjNC00...',
                key: 'uploads/1712345678_video-besar.mp4',
              }),
            ),
          },
        },
      },
    },
    '/uploads/get-part-url': {
      post: {
        tags: ['Uploads'],
        summary: 'Presigned URL for one multipart part',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  uploadId: { type: 'string' },
                  partNumber: { type: 'integer' },
                  partSize: { type: 'integer' },
                  isLastPart: { type: 'boolean' },
                },
                required: ['key', 'uploadId', 'partNumber', 'partSize'],
              },
              example: {
                key: 'uploads/1712345678_video-besar.mp4',
                uploadId: 'YzBmNTZlN2EtYWRjNC00...',
                partNumber: 1,
                partSize: 52428800,
                isLastPart: false,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Part upload URL',
            ...jsonContent(
              {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      uploadUrl: { type: 'string' },
                      partNumber: { type: 'integer' },
                      expiresIn: { type: 'integer' },
                    },
                  },
                  requestId: { type: 'string' },
                },
              },
              ok({
                uploadUrl: 'https://…presigned-part…',
                partNumber: 1,
                expiresIn: 3600,
              }),
            ),
          },
        },
      },
    },
    '/uploads/complete-upload': {
      post: {
        tags: ['Uploads'],
        summary: 'Complete multipart upload',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  uploadId: { type: 'string' },
                  parts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        PartNumber: { type: 'integer' },
                        ETag: { type: 'string' },
                      },
                      required: ['PartNumber', 'ETag'],
                    },
                  },
                },
                required: ['key', 'uploadId', 'parts'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Assembled object',
            ...jsonContent(
              {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      fileUrl: { type: 'string' },
                      key: { type: 'string' },
                    },
                  },
                  requestId: { type: 'string' },
                },
              },
              ok({
                fileUrl: 'https://cdn.example.com/uploads/1712345678_video-besar.mp4',
                key: 'uploads/1712345678_video-besar.mp4',
              }),
            ),
          },
        },
      },
    },
    '/uploads/abort-upload': {
      post: {
        tags: ['Uploads'],
        summary: 'Abort multipart upload and clean up parts',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  uploadId: { type: 'string' },
                },
                required: ['key', 'uploadId'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Aborted',
            ...jsonContent(
              {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: { message: { type: 'string' } },
                  },
                  requestId: { type: 'string' },
                },
              },
              ok({ message: 'Multipart upload aborted successfully.' }),
            ),
          },
        },
      },
    },

    // ── Todos ──
    '/todos': {
      get: {
        tags: ['Todos'],
        summary: 'List todos',
        description: 'List current user todos with filter, sort, and pagination.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['completed', 'active'] },
            example: 'active',
          },
          {
            name: 'category',
            in: 'query',
            description: 'Category UUID',
            schema: { type: 'string', format: 'uuid' },
            example: exampleCategory.id,
          },
          {
            name: 'tag',
            in: 'query',
            description: 'Tag UUID',
            schema: { type: 'string', format: 'uuid' },
            example: exampleTag.id,
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['low', 'medium', 'high'] },
            example: 'high',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            example: 'auth',
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['createdAt', '-createdAt', 'dueDate', '-dueDate', 'priority', '-priority'],
              default: '-createdAt',
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Paginated todo list',
            ...jsonContent(
              { $ref: '#/components/schemas/TodoListResponse' },
              ok([exampleTodoWithRelations], exampleMeta),
            ),
          },
          '401': {
            description: 'Unauthorized',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('UNAUTHORIZED', 'Missing or invalid Authorization header'),
            ),
          },
        },
      },
      post: {
        tags: ['Todos'],
        summary: 'Create todo',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', maxLength: 200, example: 'Ship auth docs' },
                  description: { type: 'string', maxLength: 2000, example: 'OpenAPI examples' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                  dueDate: { type: 'string', format: 'date-time', nullable: true },
                  categoryId: { type: 'string', format: 'uuid', nullable: true },
                  tagIds: {
                    type: 'array',
                    maxItems: 10,
                    items: { type: 'string', format: 'uuid' },
                  },
                },
                required: ['title'],
              },
              example: {
                title: 'Ship auth docs',
                description: 'OpenAPI response examples for FE',
                priority: 'high',
                dueDate: '2026-07-20T00:00:00.000Z',
                categoryId: exampleCategory.id,
                tagIds: [exampleTag.id],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            ...jsonContent({ $ref: '#/components/schemas/TodoResponse' }, ok(exampleTodo)),
          },
          '400': {
            description: 'Validation error',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('VALIDATION_ERROR', 'Category not found'),
            ),
          },
          '401': {
            description: 'Unauthorized',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('UNAUTHORIZED', 'Missing or invalid Authorization header'),
            ),
          },
        },
      },
    },
    '/todos/{id}': {
      get: {
        tags: ['Todos'],
        summary: 'Get todo',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            example: exampleTodo.id,
          },
        ],
        responses: {
          '200': {
            description: 'Todo with category and tags',
            ...jsonContent({ $ref: '#/components/schemas/TodoDetailResponse' }, ok(exampleTodoWithRelations)),
          },
          '403': {
            description: 'Not owner',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('FORBIDDEN', 'You do not have access to this todo'),
            ),
          },
          '404': {
            description: 'Not found',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('NOT_FOUND', 'Todo not found')),
          },
        },
      },
      patch: {
        tags: ['Todos'],
        summary: 'Update todo',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  completed: { type: 'boolean' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  dueDate: { type: 'string', format: 'date-time', nullable: true },
                  categoryId: { type: 'string', format: 'uuid', nullable: true },
                  tagIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
              example: { completed: true, priority: 'medium' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            ...jsonContent({ $ref: '#/components/schemas/TodoResponse' }, ok({ ...exampleTodo, completed: true })),
          },
          '404': {
            description: 'Not found',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('NOT_FOUND', 'Todo not found')),
          },
        },
      },
      delete: {
        tags: ['Todos'],
        summary: 'Delete todo',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Deleted',
            ...jsonContent({ $ref: '#/components/schemas/DeletedResponse' }, ok({ deleted: true })),
          },
          '404': {
            description: 'Not found',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('NOT_FOUND', 'Todo not found')),
          },
        },
      },
    },
    '/todos/batch': {
      patch: {
        tags: ['Todos'],
        summary: 'Batch operations',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['complete-all', 'delete-completed'],
                  },
                },
                required: ['action'],
              },
              example: { action: 'complete-all' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Batch result',
            ...jsonContent({ $ref: '#/components/schemas/BatchResultResponse' }, ok({ affected: 5 })),
          },
        },
      },
    },

    // ── Categories ──
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'All categories',
            ...jsonContent({ $ref: '#/components/schemas/CategoryListResponse' }, ok([exampleCategory])),
          },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create category (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Work' },
                  color: { type: 'string', example: '#3B82F6' },
                },
                required: ['name'],
              },
              example: { name: 'Work', color: '#3B82F6' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            ...jsonContent({ $ref: '#/components/schemas/CategoryResponse' }, ok(exampleCategory)),
          },
          '403': {
            description: 'Admin only',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('FORBIDDEN', 'Admin access required')),
          },
          '409': {
            description: 'Name exists',
            ...jsonContent(
              { $ref: '#/components/schemas/ErrorResponse' },
              err('CONFLICT', 'Category "Work" already exists'),
            ),
          },
        },
      },
    },
    '/categories/{id}': {
      patch: {
        tags: ['Categories'],
        summary: 'Update category (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  color: { type: 'string', nullable: true },
                },
              },
              example: { name: 'Work', color: '#2563EB' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            ...jsonContent(
              { $ref: '#/components/schemas/CategoryResponse' },
              ok({ ...exampleCategory, color: '#2563EB' }),
            ),
          },
          '404': {
            description: 'Not found',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('NOT_FOUND', 'Category not found')),
          },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete category (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Deleted',
            ...jsonContent({ $ref: '#/components/schemas/DeletedResponse' }, ok({ deleted: true })),
          },
        },
      },
    },

    // ── Tags ──
    '/tags': {
      get: {
        tags: ['Tags'],
        summary: 'List tags',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'All tags',
            ...jsonContent({ $ref: '#/components/schemas/TagListResponse' }, ok([exampleTag])),
          },
        },
      },
      post: {
        tags: ['Tags'],
        summary: 'Create tag (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'urgent' },
                  color: { type: 'string', example: '#EF4444' },
                },
                required: ['name'],
              },
              example: { name: 'urgent', color: '#EF4444' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            ...jsonContent({ $ref: '#/components/schemas/TagResponse' }, ok(exampleTag)),
          },
          '403': {
            description: 'Admin only',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('FORBIDDEN', 'Admin access required')),
          },
        },
      },
    },
    '/tags/{id}': {
      patch: {
        tags: ['Tags'],
        summary: 'Update tag (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  color: { type: 'string', nullable: true },
                },
              },
              example: { color: '#DC2626' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            ...jsonContent({ $ref: '#/components/schemas/TagResponse' }, ok({ ...exampleTag, color: '#DC2626' })),
          },
        },
      },
      delete: {
        tags: ['Tags'],
        summary: 'Delete tag (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Deleted',
            ...jsonContent({ $ref: '#/components/schemas/DeletedResponse' }, ok({ deleted: true })),
          },
        },
      },
    },

    // ── Users (admin) ──
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paginated users (no passwordHash)',
            ...jsonContent({ $ref: '#/components/schemas/UserListResponse' }, ok([exampleUser], exampleMeta)),
          },
          '403': {
            description: 'Admin only',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('FORBIDDEN', 'Admin access required')),
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'User detail',
            ...jsonContent({ $ref: '#/components/schemas/PublicUserResponse' }, ok(exampleUser)),
          },
          '404': {
            description: 'Not found',
            ...jsonContent({ $ref: '#/components/schemas/ErrorResponse' }, err('NOT_FOUND', 'User not found')),
          },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update role (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'admin'] },
                },
                required: ['role'],
              },
              example: { role: 'admin' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            ...jsonContent({ $ref: '#/components/schemas/PublicUserResponse' }, ok({ ...exampleUser, role: 'admin' })),
          },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Deleted',
            ...jsonContent({ $ref: '#/components/schemas/DeletedResponse' }, ok({ deleted: true })),
          },
        },
      },
    },
  },
};
