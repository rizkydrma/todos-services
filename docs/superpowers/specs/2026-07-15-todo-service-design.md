> **HISTORICAL** — design/plan trail. Path & layout di dokumen ini bisa usang. Kode sekarang: `docs/architecture.md`.

# Todo Service — Design Spec

**Date:** 2026-07-15  
**Status:** Draft  
**Author:** Rizky Darma  

---

## Overview

Backend service untuk todo app sederhana. Digunakan sebagai bahan pembelajaran full-stack development (web, mobile, dll). Setiap aksi user wajib login terlebih dahulu via Firebase Auth (Google OAuth atau Email/Password).

**Tech Stack:** Hono · Zod · TypeScript · Firebase Auth · Scalar · Drizzle ORM · Cloudflare D1

---

## 1. API Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | ❌ | Register user baru. Body: `{ token: "<firebase-id-token>" }`. Default role: `user` |
| `POST` | `/auth/login` | ❌ | Login. Body: `{ token: "<firebase-id-token>" }`. Return user profile |
| `GET` | `/auth/me` | ✅ | Get current user profile. Sync email/name dari Firebase jika berbeda |

### Todos

| Method | Path | Auth | Admin | Description |
|--------|------|------|-------|-------------|
| `GET` | `/todos` | ✅ | ❌ | List todos user sendiri. Support filter, sort, search, pagination |
| `POST` | `/todos` | ✅ | ❌ | Create todo |
| `GET` | `/todos/:id` | ✅ | ❌ | Detail todo beserta category & tags |
| `PATCH` | `/todos/:id` | ✅ | ❌ | Partial update todo |
| `DELETE` | `/todos/:id` | ✅ | ❌ | Delete todo |
| `PATCH` | `/todos/batch` | ✅ | ❌ | Bulk operation: complete all / delete all completed |

**Query params `GET /todos`:**
- `status` — `completed` | `active`
- `category` — category ID
- `tag` — tag ID  
- `search` — keyword search di title
- `priority` — `low` | `medium` | `high`
- `sort` — `createdAt` | `dueDate` | `priority` | `-createdAt` | `-dueDate` | `-priority` (default: `-createdAt`)
- `page`, `limit` — pagination (default: `page=1`, `limit=20`)

**Batch body `PATCH /todos/batch`:**
```json
{ "action": "complete-all" }
{ "action": "delete-completed" }
```

### Categories (Read: all auth user, Write: admin)

| Method | Path | Auth | Admin | Description |
|--------|------|------|-------|-------------|
| `GET` | `/categories` | ✅ | ❌ | List all categories |
| `POST` | `/categories` | ✅ | ✅ | Create category. Body: `{ name, color? }` |
| `PATCH` | `/categories/:id` | ✅ | ✅ | Update category |
| `DELETE` | `/categories/:id` | ✅ | ✅ | Delete category |

### Tags (Read: all auth user, Write: admin)

| Method | Path | Auth | Admin | Description |
|--------|------|------|-------|-------------|
| `GET` | `/tags` | ✅ | ❌ | List all tags |
| `POST` | `/tags` | ✅ | ✅ | Create tag. Body: `{ name, color? }` |
| `PATCH` | `/tags/:id` | ✅ | ✅ | Update tag |
| `DELETE` | `/tags/:id` | ✅ | ✅ | Delete tag |

### Users (Admin only)

| Method | Path | Auth | Admin | Description |
|--------|------|------|-------|-------------|
| `GET` | `/users` | ✅ | ✅ | List all users + pagination |
| `GET` | `/users/:id` | ✅ | ✅ | Detail user |
| `PATCH` | `/users/:id` | ✅ | ✅ | Update user role (`user` ↔ `admin`) |
| `DELETE` | `/users/:id` | ✅ | ✅ | Delete user |

### API Documentation

Scalar UI di host header subdomain `docs.*`. OpenAPI spec di-generate dari Hono route definitions.

---

## 2. Database Schema (D1 SQLite via Drizzle ORM)

```ts
users
  id           text (PK, UUID)
  firebaseUid  text (UNIQUE, NOT NULL)
  email        text (UNIQUE, NOT NULL)
  name         text (NOT NULL)
  role         text (NOT NULL, DEFAULT 'user')   // 'user' | 'admin'
  createdAt    text (NOT NULL, ISO 8601)
  updatedAt    text (NOT NULL, ISO 8601)

categories
  id           text (PK, UUID)
  name         text (UNIQUE, NOT NULL)
  color        text (nullable)
  createdAt    text (NOT NULL, ISO 8601)
  updatedAt    text (NOT NULL, ISO 8601)

tags
  id           text (PK, UUID)
  name         text (UNIQUE, NOT NULL)
  color        text (nullable)
  createdAt    text (NOT NULL, ISO 8601)
  updatedAt    text (NOT NULL, ISO 8601)

todos
  id           text (PK, UUID)
  userId       text (FK → users.id, NOT NULL)
  title        text (NOT NULL)
  description  text (nullable)
  completed    integer (NOT NULL, DEFAULT 0)     // 0=false, 1=true (SQLite no boolean)
  priority     text (NOT NULL, DEFAULT 'medium')  // 'low' | 'medium' | 'high'
  dueDate      text (nullable, ISO 8601 date)
  categoryId   text (nullable, FK → categories.id, SET NULL on delete)
  createdAt    text (NOT NULL, ISO 8601)
  updatedAt    text (NOT NULL, ISO 8601)

todo_tags (junction)
  todoId       text (FK → todos.id, ON DELETE CASCADE)
  tagId        text (FK → tags.id, ON DELETE CASCADE)
  PRIMARY KEY (todoId, tagId)
```

**Design decisions:**
- Semua PK pakai UUID (generated di app layer) — aman untuk multi-region replica
- Date/time pakai ISO 8601 string karena D1 tidak punya native datetime type
- `completed` pakai integer 0/1 — Drizzle mapping ke TS `boolean`
- Categories & tags adalah master data global (semua user lihat yang sama, admin yang manage)

---

## 3. Authentication Flow

### Architecture

**Pattern: Firebase ID Token verification via JWK (local, cached)**

```
Client → Login via Firebase Auth SDK (Google OAuth atau Email/Password)
       → Dapat Firebase ID Token (getIdToken())
       → Kirim token di header Authorization: Bearer <token>

Backend → Auth Middleware:
  1. Extract token dari header
  2. Fetch Firebase JWK public keys (cached di Worker memory)
  3. Verify JWT: signature, aud, iss, exp
  4. Extract decoded payload: firebaseUid, email, email_verified
  5. Query D1: cari user by firebaseUid
  6. Attach user ke request context: { id, firebaseUid, email, name, role }
  7. Gagal di step manapun → 401 Unauthorized
```

### Register Flow

1. Client login via Firebase Auth SDK → dapat ID token
2. Client POST `/auth/register` dengan ID token
3. Backend verify token → cek firebaseUid belum ada di D1
4. Insert user dengan `role: 'user'`, email & name dari token (sudah verified oleh Firebase/Google)
5. Return user profile

### Login Flow

1. Client login via Firebase → dapat ID token
2. Client POST `/auth/login` dengan ID token
3. Backend verify token → cari user by firebaseUid
4. Jika tidak ditemukan → 401 (user belum register)
5. Sync email/name jika berbeda
6. Return user profile

### Pengecekan Email

- Email di Firebase ID token sudah verified oleh Google/Firebase (`email_verified: true`)
- Backend tidak perlu verifikasi email secara terpisah
- Sync email terjadi di endpoint `/auth/me`: jika email dari token ≠ email di D1, update D1

---

## 4. Architecture & Design Patterns

### Dependency Flow

```
Routes → Services → Repository Interfaces → D1 Repo Implementations → D1 Database
```

### Pattern: Repository Interface

Setiap entity punya interface sebagai kontrak, implementasi dengan Drizzle.

```ts
interface ITodoRepository {
  findMany(filter: TodoFilter): Promise<PaginatedResult<Todo>>
  findById(id: string): Promise<Todo | null>
  create(data: CreateTodoInput): Promise<Todo>
  update(id: string, data: UpdateTodoInput): Promise<Todo>
  delete(id: string): Promise<void>
}

class D1TodoRepository implements ITodoRepository { /* Drizzle implementation */ }
```

**Benefits:**
- Service tidak tightly-coupled ke Drizzle/D1
- Testing: inject mock repository tanpa database asli
- Interface = dokumentasi kontrak
- Bisa ganti database tanpa ubah service layer

### Pattern: Typed Error Handling

```ts
type AppErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN'
  | 'NOT_FOUND' | 'CONFLICT' | 'TOO_MANY_REQUESTS' | 'INTERNAL_ERROR'

class AppError extends Error {
  code: AppErrorCode
  status: number           // HTTP status
  details?: unknown        // e.g. Zod issues
}
```

### Pattern: Dependency Injection (Factory)

```ts
function createRepositories(db: DrizzleDB) {
  return {
    todos: new D1TodoRepository(db),
    categories: new D1CategoryRepository(db),
    tags: new D1TagRepository(db),
    users: new D1UserRepository(db),
  }
}
```

---

## 5. Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 },
  "requestId": "req_abc123"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Todo dengan id xyz tidak ditemukan"
  },
  "requestId": "req_abc123"
}
```

### HTTP Status Codes

| Code | Condition |
|------|-----------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Internal error |

---

## 6. Middleware Stack Order

```
1. requestIdMiddleware    → Generate/forward X-Request-Id
2. CORS                   → Cross-origin
3. Logger                 → Structured logging
4. Rate Limiter           → Auth endpoints only
5. Auth Middleware        → Verify Firebase ID token (per route group)
6. Admin Middleware        → Role check (per route)
7. Routes                 → Business logic
--- LAST ---
8. Error Middleware        → Global error handler
```

---

## 7. Project Structure

```
service/
├── src/
│   ├── index.ts                    # Entry point: Hono app, middleware stack, route mount
│   ├── app.ts                      # createApp() factory (untuk testing)
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── todos.routes.ts
│   │   ├── categories.routes.ts
│   │   ├── tags.routes.ts
│   │   ├── users.routes.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── admin.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── request-id.ts
│   │   └── rate-limiter.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── todos.service.ts
│   │   ├── categories.service.ts
│   │   ├── tags.service.ts
│   │   └── users.service.ts
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   ├── todo.repo.ts
│   │   │   ├── category.repo.ts
│   │   │   ├── tag.repo.ts
│   │   │   └── user.repo.ts
│   │   ├── d1/
│   │   │   ├── todo.repo.ts
│   │   │   ├── category.repo.ts
│   │   │   ├── tag.repo.ts
│   │   │   └── user.repo.ts
│   │   └── index.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── lib/
│   │   ├── errors.ts
│   │   ├── response.ts
│   │   ├── pagination.ts
│   │   └── firebase.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── schemas.ts
│   └── config/
│       └── env.ts
├── package.json
├── tsconfig.json
├── wrangler.toml
├── drizzle.config.ts
└── .gitignore
```

---

## 8. Seed Data

Seed script akan:
1. Membuat 2 user di Firebase Auth via REST API
2. Insert ke D1 `users` table
3. Insert sample categories & tags

| Type | Data |
|---|---|
| **Admin** | `rizky.darmarazak@gmail.com` / `23oktober99` / Rizky Darma / admin |
| **User** | `rdarmarazak93@gmail.com` / `23oktober99` / Razak / user |
| **Categories** | Work (blue), Personal (green), Learning (yellow) |
| **Tags** | urgent, low-priority, backlog |

---

## 9. Environment Variables (Cloudflare Workers)

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_API_KEY` | Firebase Web API Key (untuk seed/create user di Firebase Auth REST API) |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email (untuk seed) |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (untuk seed) |
| `ENVIRONMENT` | `development` \| `production` |

---

## 10. Deployment

- Platform: **Cloudflare Workers**
- Database: **Cloudflare D1**
- Domain pattern:
  - `api.todos.com` → Hono Worker (API)
  - `docs.todos.com` → Scalar UI (routing based on host header)
- CI/CD: `wrangler deploy` via GitHub Actions atau manual CLI
