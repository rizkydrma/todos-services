# Todo Service API

REST API backend untuk aplikasi Todo, dibangun dengan [Hono](https://hono.dev) dan berjalan di [Cloudflare Workers](https://workers.cloudflare.com). Proyek ini adalah resource belajar untuk pengembangan full-stack modern — mencakup autentikasi, otorisasi, CRUD, filtering, pagination, dan dokumentasi OpenAPI.

## 🧱 Tech Stack

| Layer          | Teknologi                                           |
| -------------- | --------------------------------------------------- |
| Runtime        | [Cloudflare Workers](https://workers.cloudflare.com) |
| Framework      | [Hono](https://hono.dev)                             |
| Database       | [Cloudflare D1](https://developers.cloudflare.com/d1) |
| ORM            | [Drizzle ORM](https://orm.drizzle.team)              |
| Auth           | Email/password (hash di D1) + Google idToken → JWT session |
| Validation     | [Zod](https://zod.dev)                               |
| API Docs       | [Scalar](https://scalar.com) (OpenAPI 3.0)           |
| Testing        | [Vitest](https://vitest.dev)                         |
| Lint/Format    | ESLint + Prettier                                    |
| Git Hooks      | Husky + lint-staged                                  |

## 📁 Project Structure

```
src/
├── app.ts                   # App factory (middleware, routes, error handler)
├── index.ts                 # Entry point (Cloudflare Worker)
├── config/
│   └── env.ts               # Environment variable validation
├── db/
│   ├── index.ts             # D1 client factory
│   ├── schema.ts            # Drizzle schema (users, todos, categories, tags, todo_tags)
│   └── seed.ts              # Database seeder
├── lib/
│   ├── errors.ts            # AppError class & HTTP error helpers
│   ├── firebase.ts          # Firebase JWT verification via Google JWKS
│   ├── pagination.ts        # Pagination helpers
│   └── response.ts          # Standardized API response builders
├── middleware/
│   ├── admin.middleware.ts   # Admin role guard
│   ├── auth.middleware.ts    # Firebase JWT verification + user lookup
│   ├── error.middleware.ts   # Global error handler (ZodError & AppError)
│   ├── rate-limiter.ts      # In-memory rate limiter (10 req/60s per IP)
│   └── request-id.ts        # X-Request-Id header injection
├── repositories/
│   ├── index.ts             # Repository factory
│   ├── interfaces/          # Repository contracts
│   └── d1/                  # D1 concrete implementations
├── routes/
│   ├── index.ts             # Route registration
│   ├── auth.routes.ts
│   ├── todos.routes.ts
│   ├── categories.routes.ts
│   ├── tags.routes.ts
│   └── users.routes.ts
├── services/                # Business logic layer
├── types/
│   ├── index.ts             # Shared types (User, Todo, Pagination, Response, etc.)
│   └── schemas.ts           # Zod validation schemas
└── tests/                   # Vitest test files
```

## 🚀 API Endpoints

### 🔐 Auth

| Method | Path             | Auth?  | Keterangan                                      |
| ------ | ---------------- | ------ | ----------------------------------------------- |
| POST   | `/auth/register` | ❌     | Register email+password → tokens                |
| POST   | `/auth/login`    | ❌     | Login email+password → tokens                   |
| POST   | `/auth/google`   | ❌     | Login Google `idToken` → tokens (auto-register) |
| POST   | `/auth/refresh`  | ❌     | Rotate access/refresh token                     |
| POST   | `/auth/logout`   | ❌     | Revoke refresh token                            |
| GET    | `/auth/me`       | ✅     | Profile user saat ini                           |

### ✅ Todos

| Method  | Path             | Auth?  | Keterangan                                   |
| ------- | ---------------- | ------ | ---------------------------------------------|
| GET     | `/todos`         | ✅     | List todos (filter, sort, search, paginasi)  |
| POST    | `/todos`         | ✅     | Buat todo baru                               |
| GET     | `/todos/:id`     | ✅     | Detail todo                                  |
| PATCH   | `/todos/:id`     | ✅     | Update todo                                  |
| DELETE  | `/todos/:id`     | ✅     | Hapus todo                                   |
| PATCH   | `/todos/batch`   | ✅     | Batch: `complete-all` / `delete-completed`   |

**Query params untuk `GET /todos`:**

| Parameter  | Tipe    | Default     | Keterangan                        |
| ---------- | ------- | ----------- | --------------------------------- |
| `status`   | string  | -           | `completed` / `active`            |
| `category` | string  | -           | Filter by category name           |
| `tag`      | string  | -           | Filter by tag name                |
| `priority` | string  | -           | `low` / `medium` / `high`         |
| `search`   | string  | -           | Cari berdasarkan title            |
| `sort`     | string  | `-createdAt`| Field sorting (prefix `-` = DESC) |
| `page`     | number  | `1`         | Nomor halaman                     |
| `limit`    | number  | `20`        | Item per halaman                  |

### 📂 Categories

| Method  | Path              | Auth?  | Keterangan                   |
| ------- | ----------------- | ------ | -----------------------------|
| GET     | `/categories`     | ✅     | List semua kategori          |
| POST    | `/categories`     | 🔑     | Buat kategori (admin only)   |
| PATCH   | `/categories/:id` | 🔑     | Update kategori (admin only) |
| DELETE  | `/categories/:id` | 🔑     | Hapus kategori (admin only)  |

### 🏷️ Tags

| Method  | Path              | Auth?  | Keterangan                   |
| ------- | ----------------- | ------ | -----------------------------|
| GET     | `/tags`           | ✅     | List semua tag               |
| POST    | `/tags`           | 🔑     | Buat tag (admin only)        |
| PATCH   | `/tags/:id`       | 🔑     | Update tag (admin only)      |
| DELETE  | `/tags/:id`       | 🔑     | Hapus tag (admin only)       |

### 👥 Users (Admin)

| Method  | Path          | Auth?  | Keterangan                    |
| ------- | ------------- | ------ | ----------------------------- |
| GET     | `/users`      | 🔑     | List semua user (admin only)  |
| GET     | `/users/:id`  | 🔑     | Detail user (admin only)      |
| PATCH   | `/users/:id`  | 🔑     | Update role user (admin only) |
| DELETE  | `/users/:id`  | 🔑     | Hapus user (admin only)       |

> ✅ = Auth user biasa &nbsp; 🔑 = Admin only &nbsp; ❌ = Public

## 🗄️ Database Schema

```
users ──────────┐
  id (PK)       │
  email         │  1:N
  password_hash │──────────► todos
  firebase_uid  │              id (PK)
  name, role    │              user_id (FK)
                │
refresh_tokens ─┘  (jti, token_hash, expires, revoked)

categories / tags / todo_tags — unchanged
```

## 🔐 Authentication Flow

### Email + password
1. `POST /auth/register` atau `POST /auth/login` dengan `{ name?, email, password }`
2. Password di-hash (PBKDF2) dan disimpan di D1
3. Response: `{ user, accessToken, refreshToken, expiresIn }`

### Google
1. Client dapatkan Firebase/Google `idToken`
2. `POST /auth/google` `{ idToken }` → verify JWKS → auto-register bila perlu
3. Response token shape **sama**

### API calls
1. Header: `Authorization: Bearer <accessToken>`
2. Access expired → `POST /auth/refresh` `{ refreshToken }`

### Contoh request / response

#### `POST /auth/register`

**Request**
```json
{
  "name": "Budi Santoso",
  "email": "budi@yahoo.com",
  "password": "rahasia123"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "budi@yahoo.com",
      "name": "Budi Santoso",
      "role": "user",
      "firebaseUid": null,
      "createdAt": "2026-07-17T10:00:00.000Z",
      "updatedAt": "2026-07-17T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "requestId": "req_abc123"
}
```

#### `POST /auth/login`

**Request**
```json
{
  "email": "budi@yahoo.com",
  "password": "rahasia123"
}
```

**Response `200`** — shape sama dengan register (`user` + `accessToken` + `refreshToken` + `expiresIn`).

**Response `401`**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  },
  "requestId": "req_abc123"
}
```

#### `POST /auth/google`

**Request**
```json
{
  "idToken": "<firebase-or-google-id-token>"
}
```

**Response `200`** — shape session sama; `user.firebaseUid` terisi.

#### `POST /auth/refresh`

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`** — session tokens baru (refresh lama di-revoke).

#### `POST /auth/logout`

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": { "ok": true },
  "requestId": "req_abc123"
}
```

#### `GET /auth/me`

**Header:** `Authorization: Bearer <accessToken>`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "budi@yahoo.com",
    "name": "Budi Santoso",
    "role": "user",
    "firebaseUid": null,
    "createdAt": "2026-07-17T10:00:00.000Z",
    "updatedAt": "2026-07-17T10:00:00.000Z"
  },
  "requestId": "req_abc123"
}
```

> Contoh yang sama juga tampil di Scalar (`/docs`) via OpenAPI examples.

## 🛠️ Getting Started

### Prasyarat

- [Bun](https://bun.sh) atau Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- Akun Cloudflare (untuk D1 database)

### Setup lokal

```bash
# Clone repo
git clone <repo-url>
cd service

# Install dependencies
bun install

# Copy & isi environment variables
cp .dev.vars.example .dev.vars

# Generate Drizzle migration
bun run db:generate

# Jalankan migration lokal
bun run db:migrate:local

# Seed data awal (optional)
bun run db:seed

# Jalankan development server
bun run dev
```

### Scripts

| Script               | Deskripsi                                     |
| -------------------- | --------------------------------------------- |
| `dev`                | Jalankan server development (Wrangler)        |
| `deploy`             | Deploy ke Cloudflare Workers                  |
| `db:generate`        | Generate Drizzle migration file               |
| `db:migrate:local`   | Jalankan migration ke D1 lokal                |
| `db:migrate:prod`    | Jalankan migration ke D1 production           |
| `db:seed`            | Seed database dengan data awal                |
| `db:studio`          | Buka Drizzle Studio (GUI database)            |
| `test`               | Jalankan test (Vitest)                        |
| `test:watch`         | Jalankan test dalam watch mode                |
| `test:coverage`      | Jalankan test dengan coverage                 |
| `lint`               | Lint check                                    |
| `lint:fix`           | Lint auto-fix                                 |
| `format`             | Format code dengan Prettier                   |
| `check`              | Type-check + format check + lint              |

### Environment Variables

| Variable              | Deskripsi                                              |
| --------------------- | ------------------------------------------------------ |
| `JWT_SECRET`          | Secret HS256 untuk access/refresh JWT (min 32 chars)   |
| `FIREBASE_PROJECT_ID` | Project ID untuk verify Google `idToken`               |
| `ENVIRONMENT`         | `development` / `production`                           |

Set `JWT_SECRET` via `.dev.vars` (local) atau `wrangler secret put JWT_SECRET` (prod).

## 📖 API Documentation

Dokumentasi interaktif **Scalar** tersedia di:

- Development: `http://localhost:8787/docs`
- Production: `https://<worker>.workers.dev/docs`

Spesifikasi OpenAPI JSON dapat diakses di endpoint `/openapi.json`.

## 🧪 Testing

Testing menggunakan **Vitest**. Struktur test terletak di direktori `tests/` yang mencakup unit test untuk services, routes, dan lib.

```bash
bun run test
```

## 📝 Status Respons Standar

Semua respons API mengikuti format ini:

**Sukses:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 },
  "requestId": "uuid"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Todo not found"
  },
  "requestId": "uuid"
}
```

## 🏗️ Architecture Pattern

Proyek ini mengikuti **3-layer architecture**:

```
Routes (Controller)  →  Services (Business Logic)  →  Repositories (Data Access)
       ↑                                                    │
       └── Hono routing + middleware                        │
                      (auth, admin, rate-limit, error)      │
                                                      D1 Database
```

- **Routes**: Menangani HTTP request/response, validasi input, middleware chain
- **Services**: Business logic, koordinasi antar repository
- **Repositories**: Data access layer — menggunakan interface pattern agar mudah diganti (saat ini implementasi D1)
