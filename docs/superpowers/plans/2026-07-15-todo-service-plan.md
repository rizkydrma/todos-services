# Todo Service — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade todo API service with Firebase Auth, layered architecture, and repository pattern.

**Architecture:** Hono routes → Services (business logic) → Repository interfaces → D1/Drizzle implementations. Firebase JWT verification via cached JWK. Typed errors, request tracing, and Scalar API docs.

**Tech Stack:** Hono, TypeScript, Zod, Firebase Auth, Drizzle ORM, Cloudflare D1, Scalar

---

### Task 1: Project Setup & Dependencies

**Files:**
- Create: `service/package.json`
- Create: `service/tsconfig.json`
- Create: `service/wrangler.toml`
- Create: `service/drizzle.config.ts`
- Create: `service/.gitignore`

- [ ] **Step 1: Initialize package.json**

Create `service/package.json`:

```json
{
  "name": "todo-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev src/index.ts",
    "deploy": "wrangler deploy src/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 execute todo-db --local --file=./drizzle/migrations.sql",
    "db:migrate:prod": "wrangler d1 execute todo-db --remote --file=./drizzle/migrations.sql",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^4.6.14",
    "zod": "^3.24.1",
    "drizzle-orm": "^0.38.3",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250109.0",
    "@types/uuid": "^10.0.0",
    "@hono/zod-openapi": "^0.18.3",
    "@scalar/hono-api-reference": "^0.5.172",
    "drizzle-kit": "^0.30.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "wrangler": "^3.101.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: Dependencies installed successfully.

- [ ] **Step 3: Create tsconfig.json**

Create `service/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["@cloudflare/workers-types/experimental"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create wrangler.toml**

Create `service/wrangler.toml`:

```toml
name = "todo-service"
main = "src/index.ts"
compatibility_date = "2025-01-10"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "todo-db"
database_id = "" # Fill after `wrangler d1 create todo-db`

[vars]
ENVIRONMENT = "development"

[env.production]
vars = { ENVIRONMENT = "production" }

[env.production.d1_databases]
binding = "DB"
database_name = "todo-db"
database_id = "" # Fill with production database ID
```

- [ ] **Step 5: Create drizzle.config.ts**

Create `service/drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
```

- [ ] **Step 6: Create .gitignore**

Create `service/.gitignore`:

```
node_modules/
dist/
.env
.wrangler/
drizzle/
*.log
.DS_Store
```

- [ ] **Step 7: Create source directories**

Run:
```bash
mkdir -p src/config src/types src/db src/lib src/repositories/interfaces src/repositories/d1 src/services src/middleware src/routes
```

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json wrangler.toml drizzle.config.ts .gitignore
git commit -m "chore: initialize project setup with Hono, Drizzle, Cloudflare"
```

---

### Task 2: Environment Configuration

**Files:**
- Create: `service/src/config/env.ts`

- [ ] **Step 1: Create typed env config**

Create `service/src/config/env.ts`:

```ts
import { z } from 'zod';

const envSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  ENVIRONMENT: z.enum(['development', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: unknown): Env {
  return envSchema.parse(env);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/config/env.ts
git commit -m "feat: add typed environment configuration with Zod validation"
```

---

### Task 3: Shared Types & Zod Schemas

**Files:**
- Create: `service/src/types/index.ts`
- Create: `service/src/types/schemas.ts`

- [ ] **Step 1: Create Zod schemas for request/response validation**

Create `service/src/types/schemas.ts`:

```ts
import { z } from 'zod';

// ── Auth ──
export const registerSchema = z.object({
  token: z.string().min(1),
});

export const loginSchema = z.object({
  token: z.string().min(1),
});

// ── Todo ──
export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
});

export const todoQuerySchema = z.object({
  status: z.enum(['completed', 'active']).optional(),
  category: z.string().uuid().optional(),
  tag: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'dueDate', '-dueDate', 'priority', '-priority']).default('-createdAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const batchTodoSchema = z.object({
  action: z.enum(['complete-all', 'delete-completed']),
});

// ── Category ──
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(7).optional().nullable(),
});

// ── Tag ──
export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(7).optional().nullable(),
});

// ── User (admin) ──
export const updateUserSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});
```

- [ ] **Step 2: Create TypeScript types**

Create `service/src/types/index.ts`:

```ts
import type { InferSelectModel } from 'drizzle-orm';
import type { users, todos, categories, tags } from '../db/schema';

// ── Drizzle inferred types ──
export type User = InferSelectModel<typeof users>;
export type Todo = InferSelectModel<typeof todos>;
export type Category = InferSelectModel<typeof categories>;
export type Tag = InferSelectModel<typeof tags>;

// ── Extended types (with relations) ──
export type TodoWithRelations = Todo & {
  category: Category | null;
  tags: Tag[];
};

// ── Auth ──
export type DecodedToken = {
  iss: string;
  aud: string;
  auth_time: number;
  user_id: string;
  sub: string;
  iat: number;
  exp: number;
  email: string;
  email_verified: boolean;
  firebase: {
    identities: { email: string[] };
    sign_in_provider: string;
  };
  name?: string;
  picture?: string;
};

// ── Pagination ──
export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ── Response ──
export type SuccessResponse<T> = {
  success: true;
  data: T;
  meta?: PaginatedResult<T>['meta'];
  requestId: string;
};

export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

- [ ] **Step 3: Commit**

```bash
git add src/types/
git commit -m "feat: add Zod schemas and TypeScript types for all entities"
```

---

### Task 4: Error Handling Library

**Files:**
- Create: `service/src/lib/errors.ts`

- [ ] **Step 1: Create AppError class with typed error codes**

Create `service/src/lib/errors.ts`:

```ts
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

const statusMap: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = statusMap[code];
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }

  // ── Factory methods ──
  static validation(message: string, details?: unknown) {
    return new AppError('VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError('FORBIDDEN', message);
  }

  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} not found`);
  }

  static conflict(message: string) {
    return new AppError('CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError('TOO_MANY_REQUESTS', message);
  }

  static internal(message = 'Internal server error') {
    return new AppError('INTERNAL_ERROR', message);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/errors.ts
git commit -m "feat: add typed AppError class with factory methods"
```

---

### Task 5: Response Helper Library

**Files:**
- Create: `service/src/lib/response.ts`

- [ ] **Step 1: Create standardized response helpers**

Create `service/src/lib/response.ts`:

```ts
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from './errors';

export function success<T>(c: Context, data: T, meta?: Record<string, unknown>, status: ContentfulStatusCode = 200) {
  const requestId = c.get('requestId') as string;
  return c.json({
    success: true as const,
    data,
    ...(meta ? { meta } : {}),
    requestId,
  }, status);
}

export function created<T>(c: Context, data: T) {
  return success(c, data, undefined, 201);
}

export function error(c: Context, err: unknown) {
  const requestId = c.get('requestId') as string;

  if (err instanceof AppError) {
    return c.json({
      success: false as const,
      error: err.toJSON(),
      requestId,
    }, err.status as ContentfulStatusCode);
  }

  console.error(`[${requestId}] Unexpected error:`, err);
  return c.json({
    success: false as const,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    requestId,
  }, 500);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/response.ts
git commit -m "feat: add standardized response helpers (success/error)"
```

---

### Task 6: Pagination Helper

**Files:**
- Create: `service/src/lib/pagination.ts`

- [ ] **Step 1: Create pagination helper**

Create `service/src/lib/pagination.ts`:

```ts
import type { PaginatedResult, PaginationParams } from '../types';

export function paginate<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pagination.ts
git commit -m "feat: add pagination helper"
```

---

### Task 7: Firebase JWT Verification Library

**Files:**
- Create: `service/src/lib/firebase.ts`

- [ ] **Step 1: Create Firebase JWT verification with JWK caching**

Create `service/src/lib/firebase.ts`:

```ts
import { AppError } from './errors';
import type { DecodedToken } from '../types';

const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return binary;
}

function base64UrlToUint8Array(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importPublicKey(certPem: string): Promise<CryptoKey> {
  const der = pemToDer(certPem);
  return crypto.subtle.importKey(
    'spki',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['verify'],
  );
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<DecodedToken> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw AppError.unauthorized('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header
  const headerStr = base64UrlDecode(headerB64);
  const header = JSON.parse(headerStr) as { kid: string; alg: string };

  if (header.alg !== 'RS256') {
    throw AppError.unauthorized('Invalid token algorithm');
  }

  // Decode payload
  const payloadStr = base64UrlDecode(payloadB64);
  const payload = JSON.parse(payloadStr);

  // Verify claims
  if (payload.aud !== projectId) {
    throw AppError.unauthorized('Invalid token audience');
  }

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw AppError.unauthorized('Invalid token issuer');
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw AppError.unauthorized('Token expired');
  }

  if (!payload.email_verified) {
    throw AppError.unauthorized('Email not verified');
  }

  // Fetch Firebase public certificates (cached in Worker scope)
  const certCache = globalThis as unknown as { __firebaseCerts?: { certs: Record<string, string>; fetchedAt: number } };

  let certs: Record<string, string>;
  if (certCache.__firebaseCerts && (Date.now() - certCache.__firebaseCerts.fetchedAt) < 3600000) {
    certs = certCache.__firebaseCerts.certs;
  } else {
    const resp = await fetch(CERT_URL);
    if (!resp.ok) throw AppError.internal('Failed to fetch Firebase certificates');
    certs = await resp.json() as Record<string, string>;
    certCache.__firebaseCerts = { certs, fetchedAt: Date.now() };
  }

  const certPem = certs[header.kid];
  if (!certPem) {
    throw AppError.unauthorized('Invalid token key ID');
  }

  // Verify signature via Web Crypto API
  const publicKey = await importPublicKey(certPem);
  const signature = base64UrlToUint8Array(signatureB64);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const valid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    publicKey,
    signature.buffer,
    data.buffer,
  );

  if (!valid) {
    throw AppError.unauthorized('Invalid token signature');
  }

  return {
    iss: payload.iss,
    aud: payload.aud,
    auth_time: payload.auth_time,
    user_id: payload.user_id,
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
    email: payload.email,
    email_verified: payload.email_verified,
    firebase: payload.firebase,
    name: payload.name,
    picture: payload.picture,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "feat: add Firebase JWT verification via Web Crypto API with cert caching"
```

---

### Task 8: Database Schema (Drizzle)

**Files:**
- Create: `service/src/db/schema.ts`

- [ ] **Step 1: Create Drizzle schema for all tables**

Create `service/src/db/schema.ts`:

```ts
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  todos: many(todos),
}));

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  todos: many(todos),
}));

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  todoTags: many(todoTags),
}));

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  dueDate: text('due_date'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const todosRelations = relations(todos, ({ one, many }) => ({
  user: one(users, { fields: [todos.userId], references: [users.id] }),
  category: one(categories, { fields: [todos.categoryId], references: [categories.id] }),
  todoTags: many(todoTags),
}));

export const todoTags = sqliteTable('todo_tags', {
  todoId: text('todo_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.todoId, t.tagId] }),
}));

export const todoTagsRelations = relations(todoTags, ({ one }) => ({
  todo: one(todos, { fields: [todoTags.todoId], references: [todos.id] }),
  tag: one(tags, { fields: [todoTags.tagId], references: [tags.id] }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add Drizzle schema for users, todos, categories, tags, todo_tags"
```

---

### Task 9: Database Client Init

**Files:**
- Create: `service/src/db/index.ts`

- [ ] **Step 1: Create D1 database client factory**

Create `service/src/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DbClient = ReturnType<typeof createDb>;
```

- [ ] **Step 2: Commit**

```bash
git add src/db/index.ts
git commit -m "feat: add D1 database client factory with Drizzle"
```

---

### Task 10: Repository Interfaces

**Files:**
- Create: `service/src/repositories/interfaces/user.repo.ts`
- Create: `service/src/repositories/interfaces/category.repo.ts`
- Create: `service/src/repositories/interfaces/tag.repo.ts`
- Create: `service/src/repositories/interfaces/todo.repo.ts`

- [ ] **Step 1: Create IUserRepository**

Create `service/src/repositories/interfaces/user.repo.ts`:

```ts
import type { User } from '../../types';
import type { PaginationParams, PaginatedResult } from '../../types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByFirebaseUid(firebaseUid: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}

export type CreateUserInput = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
};
```

- [ ] **Step 2: Create ICategoryRepository**

Create `service/src/repositories/interfaces/category.repo.ts`:

```ts
import type { Category } from '../../types';

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findMany(): Promise<Category[]>;
  create(data: CreateCategoryInput): Promise<Category>;
  update(id: string, data: UpdateCategoryInput): Promise<Category>;
  delete(id: string): Promise<void>;
}

export type CreateCategoryInput = {
  id: string;
  name: string;
  color?: string | null;
};

export type UpdateCategoryInput = {
  name?: string;
  color?: string | null;
};
```

- [ ] **Step 3: Create ITagRepository**

Create `service/src/repositories/interfaces/tag.repo.ts`:

```ts
import type { Tag } from '../../types';

export interface ITagRepository {
  findById(id: string): Promise<Tag | null>;
  findByName(name: string): Promise<Tag | null>;
  findMany(): Promise<Tag[]>;
  findByIds(ids: string[]): Promise<Tag[]>;
  create(data: CreateTagInput): Promise<Tag>;
  update(id: string, data: UpdateTagInput): Promise<Tag>;
  delete(id: string): Promise<void>;
}

export type CreateTagInput = {
  id: string;
  name: string;
  color?: string | null;
};

export type UpdateTagInput = {
  name?: string;
  color?: string | null;
};
```

- [ ] **Step 4: Create ITodoRepository**

Create `service/src/repositories/interfaces/todo.repo.ts`:

```ts
import type { Todo, TodoWithRelations, PaginationParams, PaginatedResult } from '../../types';

export interface ITodoRepository {
  findById(id: string): Promise<TodoWithRelations | null>;
  findByUserId(input: FindTodosInput & PaginationParams): Promise<PaginatedResult<TodoWithRelations>>;
  create(data: CreateTodoInput): Promise<Todo>;
  update(id: string, data: UpdateTodoInput): Promise<Todo>;
  delete(id: string): Promise<void>;
  deleteCompletedByUserId(userId: string): Promise<number>;
  completeAllByUserId(userId: string): Promise<number>;
}

export type FindTodosInput = {
  userId: string;
  status?: 'completed' | 'active';
  categoryId?: string;
  tagId?: string;
  priority?: 'low' | 'medium' | 'high';
  search?: string;
  sort?: 'createdAt' | '-createdAt' | 'dueDate' | '-dueDate' | 'priority' | '-priority';
};

export type CreateTodoInput = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};

export type UpdateTodoInput = {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};
```

- [ ] **Step 5: Commit**

```bash
git add src/repositories/interfaces/
git commit -m "feat: add repository interfaces for users, categories, tags, and todos"
```

---

### Task 11: D1 Repository Implementations

**Files:**
- Create: `service/src/repositories/d1/user.repo.ts`
- Create: `service/src/repositories/d1/category.repo.ts`
- Create: `service/src/repositories/d1/tag.repo.ts`
- Create: `service/src/repositories/d1/todo.repo.ts`
- Create: `service/src/repositories/index.ts`

- [ ] **Step 1: Create D1UserRepository**

Create `service/src/repositories/d1/user.repo.ts`:

```ts
import { eq, like, or, and, sql } from 'drizzle-orm';
import { users } from '../../db/schema';
import type { DbClient } from '../../db';
import type { IUserRepository, CreateUserInput, UpdateUserInput } from '../interfaces/user.repo';
import type { PaginatedResult, PaginationParams, User } from '../../types';
import { paginate } from '../../lib/pagination';

export class D1UserRepository implements IUserRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  }

  async findMany(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>> {
    const conditions = [];
    if (params.search) {
      conditions.push(
        or(
          like(users.name, `%${params.search}%`),
          like(users.email, `%${params.search}%`),
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const [data, countResult] = await Promise.all([
      this.db.select().from(users).where(where).limit(params.limit).offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(users).where(where),
    ]);

    return paginate(data, countResult[0]?.count ?? 0, params);
  }

  async create(data: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db.insert(users).values({
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result[0];
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db.update(users)
      .set({ ...data, updatedAt: now })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
```

- [ ] **Step 2: Create D1CategoryRepository**

Create `service/src/repositories/d1/category.repo.ts`:

```ts
import { eq } from 'drizzle-orm';
import { categories } from '../../db/schema';
import type { DbClient } from '../../db';
import type { ICategoryRepository, CreateCategoryInput, UpdateCategoryInput } from '../interfaces/category.repo';
import type { Category } from '../../types';

export class D1CategoryRepository implements ICategoryRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<Category | null> {
    const result = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByName(name: string): Promise<Category | null> {
    const result = await this.db.select().from(categories).where(eq(categories.name, name)).limit(1);
    return result[0] ?? null;
  }

  async findMany(): Promise<Category[]> {
    return this.db.select().from(categories);
  }

  async create(data: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const result = await this.db.insert(categories).values({
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result[0];
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const result = await this.db.update(categories)
      .set({ ...data, updatedAt: now })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(categories).where(eq(categories.id, id));
  }
}
```

- [ ] **Step 3: Create D1TagRepository**

Create `service/src/repositories/d1/tag.repo.ts`:

```ts
import { eq, inArray } from 'drizzle-orm';
import { tags } from '../../db/schema';
import type { DbClient } from '../../db';
import type { ITagRepository, CreateTagInput, UpdateTagInput } from '../interfaces/tag.repo';
import type { Tag } from '../../types';

export class D1TagRepository implements ITagRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<Tag | null> {
    const result = await this.db.select().from(tags).where(eq(tags.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByName(name: string): Promise<Tag | null> {
    const result = await this.db.select().from(tags).where(eq(tags.name, name)).limit(1);
    return result[0] ?? null;
  }

  async findMany(): Promise<Tag[]> {
    return this.db.select().from(tags);
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(tags).where(inArray(tags.id, ids));
  }

  async create(data: CreateTagInput): Promise<Tag> {
    const now = new Date().toISOString();
    const result = await this.db.insert(tags).values({
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result[0];
  }

  async update(id: string, data: UpdateTagInput): Promise<Tag> {
    const now = new Date().toISOString();
    const result = await this.db.update(tags)
      .set({ ...data, updatedAt: now })
      .where(eq(tags.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(tags).where(eq(tags.id, id));
  }
}
```

- [ ] **Step 4: Create D1TodoRepository**

Create `service/src/repositories/d1/todo.repo.ts`:

```ts
import { eq, and, or, like, sql, asc, desc } from 'drizzle-orm';
import { todos } from '../../db/schema';
import type { DbClient } from '../../db';
import type {
  ITodoRepository,
  FindTodosInput,
  CreateTodoInput,
  UpdateTodoInput,
} from '../interfaces/todo.repo';
import type { Todo, TodoWithRelations, PaginatedResult, PaginationParams } from '../../types';
import { paginate } from '../../lib/pagination';

export class D1TodoRepository implements ITodoRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<TodoWithRelations | null> {
    const result = await this.db.query.todos.findFirst({
      where: eq(todos.id, id),
      with: {
        category: true,
        todoTags: {
          with: { tag: true },
        },
      },
    });

    if (!result) return null;

    return {
      ...result,
      tags: result.todoTags.map(tt => tt.tag),
    } as TodoWithRelations;
  }

  async findByUserId(input: FindTodosInput & PaginationParams): Promise<PaginatedResult<TodoWithRelations>> {
    const conditions = [eq(todos.userId, input.userId)];

    if (input.status === 'completed') conditions.push(eq(todos.completed, true));
    else if (input.status === 'active') conditions.push(eq(todos.completed, false));

    if (input.categoryId) conditions.push(eq(todos.categoryId, input.categoryId));
    if (input.priority) conditions.push(eq(todos.priority, input.priority));
    if (input.search) conditions.push(like(todos.title, `%${input.search}%`));

    const where = and(...conditions);
    const offset = (input.page - 1) * input.limit;

    let orderBy;
    const sort = input.sort ?? '-createdAt';
    const direction = sort.startsWith('-') ? 'desc' : 'asc';
    const column = sort.replace(/^-/, '');

    if (column === 'createdAt') orderBy = direction === 'desc' ? desc(todos.createdAt) : asc(todos.createdAt);
    else if (column === 'dueDate') orderBy = direction === 'desc' ? desc(todos.dueDate) : asc(todos.dueDate);
    else if (column === 'priority') orderBy = direction === 'desc' ? desc(todos.priority) : asc(todos.priority);
    else orderBy = desc(todos.createdAt);

    const [rawData, countResult] = await Promise.all([
      this.db.query.todos.findMany({
        where,
        with: {
          category: true,
          todoTags: { with: { tag: true } },
        },
        limit: input.limit,
        offset,
        orderBy,
      }),
      this.db.select({ count: sql<number>`count(*)` }).from(todos).where(where),
    ]);

    let data = rawData.map(t => ({
      ...t,
      tags: t.todoTags.map(tt => tt.tag),
    })) as TodoWithRelations[];

    let total = countResult[0]?.count ?? 0;

    // Filter by tag in-memory (since it requires junction join)
    if (input.tagId) {
      data = data.filter(t => t.tags.some(tag => tag.id === input.tagId));
      total = data.length;
      data = data.slice(0, input.limit);
    }

    return paginate(data, total, { page: input.page, limit: input.limit });
  }

  async create(data: CreateTodoInput): Promise<Todo> {
    const now = new Date().toISOString();
    const { tagIds, ...todoData } = data;

    const result = await this.db.insert(todos).values({
      ...todoData,
      createdAt: now,
      updatedAt: now,
    }).returning();

    if (tagIds && tagIds.length > 0) {
      await this.db.insert(todoTags).values(
        tagIds.map(tagId => ({ todoId: result[0].id, tagId })),
      );
    }

    return result[0];
  }

  async update(id: string, data: UpdateTodoInput): Promise<Todo> {
    const now = new Date().toISOString();
    const { tagIds, ...todoData } = data;

    const result = await this.db.update(todos)
      .set({ ...todoData, updatedAt: now })
      .where(eq(todos.id, id))
      .returning();

    if (tagIds !== undefined) {
      await this.db.delete(todoTags).where(eq(todoTags.todoId, id));
      if (tagIds.length > 0) {
        await this.db.insert(todoTags).values(
          tagIds.map(tagId => ({ todoId: id, tagId })),
        );
      }
    }

    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(todos).where(eq(todos.id, id));
  }

  async deleteCompletedByUserId(userId: string): Promise<number> {
    const result = await this.db.delete(todos)
      .where(and(eq(todos.userId, userId), eq(todos.completed, true)));
    return result.meta?.rows_written ?? 0;
  }

  async completeAllByUserId(userId: string): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db.update(todos)
      .set({ completed: true, updatedAt: now })
      .where(and(eq(todos.userId, userId), eq(todos.completed, false)));
    return result.meta?.rows_written ?? 0;
  }
}
```

- [ ] **Step 5: Create repository factory**

Create `service/src/repositories/index.ts`:

```ts
import type { DbClient } from '../db';
import { D1UserRepository } from './d1/user.repo';
import { D1CategoryRepository } from './d1/category.repo';
import { D1TagRepository } from './d1/tag.repo';
import { D1TodoRepository } from './d1/todo.repo';

export function createRepositories(db: DbClient) {
  return {
    users: new D1UserRepository(db),
    categories: new D1CategoryRepository(db),
    tags: new D1TagRepository(db),
    todos: new D1TodoRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
```

- [ ] **Step 6: Commit**

```bash
git add src/repositories/d1/ src/repositories/index.ts
git commit -m "feat: add D1 repository implementations with factory pattern"
```

---

### Task 12: Auth Service

**Files:**
- Create: `service/src/services/auth.service.ts`

- [ ] **Step 1: Create auth service with register, login, and getProfile**

Create `service/src/services/auth.service.ts`:

```ts
import { v4 as uuidv4 } from 'uuid';
import type { IUserRepository } from '../repositories/interfaces/user.repo';
import { AppError } from '../lib/errors';
import type { User } from '../types';

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async register(tokenPayload: {
    firebaseUid: string;
    email: string;
    name: string;
  }): Promise<User> {
    const existing = await this.userRepo.findByFirebaseUid(tokenPayload.firebaseUid);
    if (existing) {
      throw AppError.conflict('User already registered');
    }

    return this.userRepo.create({
      id: uuidv4(),
      firebaseUid: tokenPayload.firebaseUid,
      email: tokenPayload.email,
      name: tokenPayload.name || tokenPayload.email.split('@')[0],
      role: 'user',
    });
  }

  async login(firebaseUid: string): Promise<User> {
    const user = await this.userRepo.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw AppError.unauthorized('User not registered. Please register first.');
    }
    return user;
  }

  async getProfile(userId: string, tokenPayload: {
    email: string;
    name: string;
  }): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    const updates: { email?: string; name?: string } = {};
    if (tokenPayload.email !== user.email) {
      updates.email = tokenPayload.email;
    }
    if (tokenPayload.name && tokenPayload.name !== user.name) {
      updates.name = tokenPayload.name;
    }

    if (Object.keys(updates).length > 0) {
      return this.userRepo.update(userId, updates);
    }

    return user;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "feat: add auth service with register, login, and profile sync"
```

---

### Task 13: Todo Service

**Files:**
- Create: `service/src/services/todos.service.ts`

- [ ] **Step 1: Create todo service with CRUD, batch, and validation**

Create `service/src/services/todos.service.ts`:

```ts
import { v4 as uuidv4 } from 'uuid';
import type { ITodoRepository, FindTodosInput, CreateTodoInput, UpdateTodoInput } from '../repositories/interfaces/todo.repo';
import type { ICategoryRepository } from '../repositories/interfaces/category.repo';
import type { ITagRepository } from '../repositories/interfaces/tag.repo';
import { AppError } from '../lib/errors';
import type { Todo, TodoWithRelations, PaginatedResult, PaginationParams } from '../types';

export class TodoService {
  constructor(
    private todoRepo: ITodoRepository,
    private categoryRepo: ICategoryRepository,
    private tagRepo: ITagRepository,
  ) {}

  async list(userId: string, query: FindTodosInput & PaginationParams): Promise<PaginatedResult<TodoWithRelations>> {
    return this.todoRepo.findByUserId({ ...query, userId });
  }

  async getById(id: string, userId: string): Promise<TodoWithRelations> {
    const todo = await this.todoRepo.findById(id);
    if (!todo) throw AppError.notFound('Todo');
    if (todo.userId !== userId) throw AppError.forbidden('You do not have access to this todo');
    return todo;
  }

  async create(userId: string, data: Omit<CreateTodoInput, 'id' | 'userId'>): Promise<Todo> {
    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw AppError.validation('Category not found');
    }

    if (data.tagIds && data.tagIds.length > 0) {
      const foundTags = await this.tagRepo.findByIds(data.tagIds);
      if (foundTags.length !== data.tagIds.length) throw AppError.validation('One or more tags not found');
    }

    return this.todoRepo.create({ id: uuidv4(), userId, ...data });
  }

  async update(id: string, userId: string, data: UpdateTodoInput): Promise<Todo> {
    await this.getById(id, userId);

    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw AppError.validation('Category not found');
    }

    if (data.tagIds && data.tagIds.length > 0) {
      const foundTags = await this.tagRepo.findByIds(data.tagIds);
      if (foundTags.length !== data.tagIds.length) throw AppError.validation('One or more tags not found');
    }

    return this.todoRepo.update(id, data);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getById(id, userId);
    await this.todoRepo.delete(id);
  }

  async batch(userId: string, action: 'complete-all' | 'delete-completed'): Promise<{ affected: number }> {
    if (action === 'complete-all') {
      return { affected: await this.todoRepo.completeAllByUserId(userId) };
    }
    if (action === 'delete-completed') {
      return { affected: await this.todoRepo.deleteCompletedByUserId(userId) };
    }
    throw AppError.validation('Invalid batch action');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/todos.service.ts
git commit -m "feat: add todo service with CRUD, batch, and relation validation"
```

---

### Task 14: Category & Tag Services

**Files:**
- Create: `service/src/services/categories.service.ts`
- Create: `service/src/services/tags.service.ts`

- [ ] **Step 1: Create category service**

Create `service/src/services/categories.service.ts`:

```ts
import { v4 as uuidv4 } from 'uuid';
import type { ICategoryRepository, CreateCategoryInput, UpdateCategoryInput } from '../repositories/interfaces/category.repo';
import { AppError } from '../lib/errors';
import type { Category } from '../types';

export class CategoryService {
  constructor(private categoryRepo: ICategoryRepository) {}

  async list(): Promise<Category[]> {
    return this.categoryRepo.findMany();
  }

  async create(data: Omit<CreateCategoryInput, 'id'>): Promise<Category> {
    const existing = await this.categoryRepo.findByName(data.name);
    if (existing) throw AppError.conflict(`Category "${data.name}" already exists`);
    return this.categoryRepo.create({ id: uuidv4(), ...data });
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw AppError.notFound('Category');

    if (data.name && data.name !== category.name) {
      const existing = await this.categoryRepo.findByName(data.name);
      if (existing) throw AppError.conflict(`Category "${data.name}" already exists`);
    }

    return this.categoryRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw AppError.notFound('Category');
    await this.categoryRepo.delete(id);
  }
}
```

- [ ] **Step 2: Create tag service**

Create `service/src/services/tags.service.ts`:

```ts
import { v4 as uuidv4 } from 'uuid';
import type { ITagRepository, CreateTagInput, UpdateTagInput } from '../repositories/interfaces/tag.repo';
import { AppError } from '../lib/errors';
import type { Tag } from '../types';

export class TagService {
  constructor(private tagRepo: ITagRepository) {}

  async list(): Promise<Tag[]> {
    return this.tagRepo.findMany();
  }

  async create(data: Omit<CreateTagInput, 'id'>): Promise<Tag> {
    const existing = await this.tagRepo.findByName(data.name);
    if (existing) throw AppError.conflict(`Tag "${data.name}" already exists`);
    return this.tagRepo.create({ id: uuidv4(), ...data });
  }

  async update(id: string, data: UpdateTagInput): Promise<Tag> {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw AppError.notFound('Tag');

    if (data.name && data.name !== tag.name) {
      const existing = await this.tagRepo.findByName(data.name);
      if (existing) throw AppError.conflict(`Tag "${data.name}" already exists`);
    }

    return this.tagRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw AppError.notFound('Tag');
    await this.tagRepo.delete(id);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/categories.service.ts src/services/tags.service.ts
git commit -m "feat: add category and tag services with duplicate name validation"
```

---

### Task 15: User Service (Admin)

**Files:**
- Create: `service/src/services/users.service.ts`

- [ ] **Step 1: Create user service for admin management**

Create `service/src/services/users.service.ts`:

```ts
import type { IUserRepository } from '../repositories/interfaces/user.repo';
import { AppError } from '../lib/errors';
import type { User, PaginatedResult, PaginationParams } from '../types';

export class UserService {
  constructor(private userRepo: IUserRepository) {}

  async list(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>> {
    return this.userRepo.findMany(params);
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    return user;
  }

  async updateRole(id: string, role: 'user' | 'admin'): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    return this.userRepo.update(id, { role });
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    await this.userRepo.delete(id);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/users.service.ts
git commit -m "feat: add user service for admin management"
```

---

### Task 16: Middleware — Request ID & Error Handler

**Files:**
- Create: `service/src/middleware/request-id.ts`
- Create: `service/src/middleware/error.middleware.ts`

- [ ] **Step 1: Create request ID middleware**

Create `service/src/middleware/request-id.ts`:

```ts
import { createMiddleware } from 'hono/factory';

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || `req_${crypto.randomUUID()}`;
  c.set('requestId', requestId);
  c.res.headers.set('X-Request-Id', requestId);
  await next();
});
```

- [ ] **Step 2: Create global error middleware**

Create `service/src/middleware/error.middleware.ts`:

```ts
import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = (c.get('requestId') as string) || 'unknown';

  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors,
      },
      requestId,
    }, 400);
  }

  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: err.toJSON(),
      requestId,
    }, err.status as ContentfulStatusCode);
  }

  console.error(`[${requestId}] Unhandled error:`, err);
  return c.json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    requestId,
  }, 500);
};
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware/request-id.ts src/middleware/error.middleware.ts
git commit -m "feat: add request ID and global error handler middleware"
```

---

### Task 17: Middleware — Auth & Admin & Rate Limiter

**Files:**
- Create: `service/src/middleware/auth.middleware.ts`
- Create: `service/src/middleware/admin.middleware.ts`
- Create: `service/src/middleware/rate-limiter.ts`

- [ ] **Step 1: Create auth middleware**

Create `service/src/middleware/auth.middleware.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import { verifyFirebaseToken } from '../lib/firebase';
import { AppError } from '../lib/errors';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';

export const authMiddleware = createMiddleware<{
  Bindings: { DB: D1Database; FIREBASE_PROJECT_ID: string };
  Variables: { requestId: string };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
    const db = createDb(c.env.DB);
    const userRepo = new D1UserRepository(db);
    const user = await userRepo.findByFirebaseUid(decoded.sub);

    if (!user) throw AppError.unauthorized('User not registered');

    c.set('user', user);
    c.set('tokenPayload', decoded);
    await next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired token');
  }
});

// Extend Hono's type for user context
declare module 'hono' {
  interface ContextVariableMap {
    user: import('../../types').User;
    tokenPayload: import('../../types').DecodedToken;
    requestId: string;
  }
}
```

- [ ] **Step 2: Create admin middleware**

Create `service/src/middleware/admin.middleware.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import { AppError } from '../lib/errors';

export const adminMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    throw AppError.forbidden('Admin access required');
  }
  await next();
});
```

- [ ] **Step 3: Create rate limiter middleware**

Create `service/src/middleware/rate-limiter.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import { AppError } from '../lib/errors';

// Simple in-memory rate limiter — resets on Worker cold start
// Production: use Cloudflare KV or Rate Limiting bindings
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
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware/auth.middleware.ts src/middleware/admin.middleware.ts src/middleware/rate-limiter.ts
git commit -m "feat: add auth, admin, and rate limiter middleware"
```

---

### Task 18: Routes

**Files:**
- Create: `service/src/routes/auth.routes.ts`
- Create: `service/src/routes/todos.routes.ts`
- Create: `service/src/routes/categories.routes.ts`
- Create: `service/src/routes/tags.routes.ts`
- Create: `service/src/routes/users.routes.ts`
- Create: `service/src/routes/index.ts`

- [ ] **Step 1: Create auth routes**

Create `service/src/routes/auth.routes.ts`:

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { registerSchema, loginSchema } from '../types/schemas';
import { verifyFirebaseToken } from '../lib/firebase';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { AuthService } from '../services/auth.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';

const authRoutes = new Hono<{ Bindings: { DB: D1Database; FIREBASE_PROJECT_ID: string } }>();

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { token } = c.req.valid('json');
  const decoded = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);

  const db = createDb(c.env.DB);
  const service = new AuthService(new D1UserRepository(db));

  const user = await service.register({
    firebaseUid: decoded.sub,
    email: decoded.email,
    name: decoded.name || decoded.email.split('@')[0],
  });

  return created(c, user);
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { token } = c.req.valid('json');
  const decoded = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);

  const db = createDb(c.env.DB);
  const service = new AuthService(new D1UserRepository(db));

  const user = await service.login(decoded.sub);
  return success(c, user);
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new AuthService(new D1UserRepository(db));

  const authUser = c.get('user');
  const tokenPayload = c.get('tokenPayload');

  const user = await service.getProfile(authUser.id, {
    email: tokenPayload.email,
    name: tokenPayload.name || '',
  });

  return success(c, user);
});

export { authRoutes };
```

- [ ] **Step 2: Create todo routes**

Create `service/src/routes/todos.routes.ts`:

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTodoSchema, updateTodoSchema, todoQuerySchema, batchTodoSchema } from '../types/schemas';
import { createDb } from '../db';
import { D1TodoRepository } from '../repositories/d1/todo.repo';
import { D1CategoryRepository } from '../repositories/d1/category.repo';
import { D1TagRepository } from '../repositories/d1/tag.repo';
import { TodoService } from '../services/todos.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import type { DbClient } from '../db';

const todosRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

function createService(db: DbClient) {
  return new TodoService(
    new D1TodoRepository(db),
    new D1CategoryRepository(db),
    new D1TagRepository(db),
  );
}

todosRoutes.get('/', authMiddleware, zValidator('query', todoQuerySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');
  const query = c.req.valid('query');

  const result = await service.list(user.id, {
    ...query,
    userId: user.id,
    categoryId: query.category,
    tagId: query.tag,
  });

  return success(c, result.data, result.meta);
});

todosRoutes.post('/', authMiddleware, zValidator('json', createTodoSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const todo = await service.create(user.id, c.req.valid('json'));
  return created(c, todo);
});

todosRoutes.get('/:id', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const todo = await service.getById(c.req.param('id'), user.id);
  return success(c, todo);
});

todosRoutes.patch('/:id', authMiddleware, zValidator('json', updateTodoSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const todo = await service.update(c.req.param('id'), user.id, c.req.valid('json'));
  return success(c, todo);
});

todosRoutes.delete('/:id', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  await service.delete(c.req.param('id'), user.id);
  return success(c, { deleted: true });
});

todosRoutes.patch('/batch', authMiddleware, zValidator('json', batchTodoSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const result = await service.batch(user.id, c.req.valid('json').action);
  return success(c, result);
});

export { todosRoutes };
```

- [ ] **Step 3: Create category routes**

Create `service/src/routes/categories.routes.ts`:

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createCategorySchema, updateCategorySchema } from '../types/schemas';
import { createDb } from '../db';
import { D1CategoryRepository } from '../repositories/d1/category.repo';
import { CategoryService } from '../services/categories.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const categoriesRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

categoriesRoutes.get('/', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  return success(c, await service.list());
});

categoriesRoutes.post('/', authMiddleware, adminMiddleware, zValidator('json', createCategorySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  return created(c, await service.create(c.req.valid('json')));
});

categoriesRoutes.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateCategorySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  return success(c, await service.update(c.req.param('id'), c.req.valid('json')));
});

categoriesRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  await service.delete(c.req.param('id'));
  return success(c, { deleted: true });
});

export { categoriesRoutes };
```

- [ ] **Step 4: Create tag routes**

Create `service/src/routes/tags.routes.ts`:

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTagSchema, updateTagSchema } from '../types/schemas';
import { createDb } from '../db';
import { D1TagRepository } from '../repositories/d1/tag.repo';
import { TagService } from '../services/tags.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const tagsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

tagsRoutes.get('/', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  return success(c, await service.list());
});

tagsRoutes.post('/', authMiddleware, adminMiddleware, zValidator('json', createTagSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  return created(c, await service.create(c.req.valid('json')));
});

tagsRoutes.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateTagSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  return success(c, await service.update(c.req.param('id'), c.req.valid('json')));
});

tagsRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  await service.delete(c.req.param('id'));
  return success(c, { deleted: true });
});

export { tagsRoutes };
```

- [ ] **Step 5: Create user routes**

Create `service/src/routes/users.routes.ts`:

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateUserSchema, userQuerySchema } from '../types/schemas';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { UserService } from '../services/users.service';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const usersRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usersRoutes.get('/', authMiddleware, adminMiddleware, zValidator('query', userQuerySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  const result = await service.list(c.req.valid('query'));
  return success(c, result.data, result.meta);
});

usersRoutes.get('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  return success(c, await service.getById(c.req.param('id')));
});

usersRoutes.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateUserSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  return success(c, await service.updateRole(c.req.param('id'), c.req.valid('json').role));
});

usersRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  await service.delete(c.req.param('id'));
  return success(c, { deleted: true });
});

export { usersRoutes };
```

- [ ] **Step 6: Create route aggregator**

Create `service/src/routes/index.ts`:

```ts
import type { Hono } from 'hono';
import { authRoutes } from './auth.routes';
import { todosRoutes } from './todos.routes';
import { categoriesRoutes } from './categories.routes';
import { tagsRoutes } from './tags.routes';
import { usersRoutes } from './users.routes';

export function registerRoutes(app: Hono) {
  app.route('/auth', authRoutes);
  app.route('/todos', todosRoutes);
  app.route('/categories', categoriesRoutes);
  app.route('/tags', tagsRoutes);
  app.route('/users', usersRoutes);
}
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/
git commit -m "feat: add all route handlers with Zod validation and middleware"
```

---

### Task 19: App Factory & Entry Point

**Files:**
- Create: `service/src/app.ts`
- Create: `service/src/index.ts`

- [ ] **Step 1: Create app factory**

Create `service/src/app.ts`:

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestIdMiddleware } from './middleware/request-id';
import { errorHandler } from './middleware/error.middleware';
import { registerRoutes } from './routes';

export function createApp() {
  const app = new Hono();

  app.use('*', requestIdMiddleware);
  app.use('*', cors());

  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  registerRoutes(app);
  app.onError(errorHandler);

  return app;
}
```

- [ ] **Step 2: Create entry point**

Create `service/src/index.ts`:

```ts
import { createApp } from './app';

const app = createApp();

export default app;
```

- [ ] **Step 3: Commit**

```bash
git add src/app.ts src/index.ts
git commit -m "feat: add app factory with health check and Worker entry point"
```

---

### Task 20: Database Seed Script

**Files:**
- Create: `service/src/db/seed.ts`

- [ ] **Step 1: Create seed script**

Create `service/src/db/seed.ts`:

```ts
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY!;

const SEED_USERS = [
  { email: 'rizky.darmarazak@gmail.com', password: '23oktober99', name: 'Rizky Darma', role: 'admin' as const },
  { email: 'rdarmarazak93@gmail.com', password: '23oktober99', name: 'Razak', role: 'user' as const },
];

const SEED_CATEGORIES = [
  { name: 'Work', color: '#3B82F6' },
  { name: 'Personal', color: '#10B981' },
  { name: 'Learning', color: '#F59E0B' },
];

const SEED_TAGS = [
  { name: 'urgent', color: '#EF4444' },
  { name: 'low-priority', color: '#6B7280' },
  { name: 'backlog', color: '#8B5CF6' },
];

async function createFirebaseUser(email: string, password: string): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await response.json();

  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') {
      const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
      const signInRes = await fetch(signInUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      const signInData = await signInRes.json();
      return signInData.localId;
    }
    throw new Error(`Firebase error: ${JSON.stringify(data.error)}`);
  }

  return data.localId;
}

async function seed() {
  console.log('🌱 Starting seed...\n');

  console.log('Creating Firebase Auth users:');
  for (const user of SEED_USERS) {
    try {
      const firebaseUid = await createFirebaseUser(user.email, user.password);
      console.log(`  ✅ ${user.email} (uid: ${firebaseUid}, role: ${user.role})`);
      console.log(`     → Insert into D1: INSERT INTO users (id, firebase_uid, email, name, role) ...`);
    } catch (err) {
      console.error(`  ❌ ${user.email}:`, err);
    }
  }

  console.log('\nCategories to seed:');
  SEED_CATEGORIES.forEach(c => console.log(`  - ${c.name} (${c.color})`));

  console.log('\nTags to seed:');
  SEED_TAGS.forEach(t => console.log(`  - ${t.name} (${t.color})`));

  console.log('\n🌱 Seed complete! Run D1 inserts manually after Firebase user creation.');
}

seed().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add database seed script for Firebase Auth and D1"
```

---

### Task 21: Scalar API Documentation

**Files:**
- Modify: `service/src/app.ts`

- [ ] **Step 1: Add Scalar docs with OpenAPI spec**

Modify `service/src/app.ts` — replace with this full content:

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app.ts
git commit -m "feat: add OpenAPI spec and Scalar API documentation UI"
```

---

### Task 22: Verify & Validate

**Files:**
- None (verification only)

- [ ] **Step 1: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Verify wrangler compatibility**

Run: `npx wrangler dev --dry-run`
Expected: No configuration errors.

- [ ] **Step 3: Commit if any fixes made**

```bash
git add -A
git commit -m "fix: compilation and wrangler config fixes"
```
