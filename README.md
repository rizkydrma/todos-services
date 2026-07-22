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
├── index.ts                 # Worker entry re-export
├── app/
│   ├── worker.ts            # export default app
│   ├── create-app.ts        # Hono factory (middleware, routes, onError)
│   └── container.ts         # Composition root — wire modules
├── platform/                # AppError, envelope, auth middleware, logger
├── modules/                 # Feature modules (auth, todos, categories, tags, uploads, users)
│   └── <feature>/
│       ├── domain/
│       ├── application/     # use cases + ports
│       ├── infrastructure/  # D1 / R2 adapters
│       ├── http/            # routes + zod
│       ├── container.ts
│       └── index.ts         # public API
├── lib/                     # jwt, password, otp, firebase, r2, email, pagination
├── db/                      # Drizzle schema, client, seed
├── routes/index.ts          # Mount module routers
├── types/                   # Shared types + Zod schemas
└── openapi/spec.ts

tests/
├── modules/                 # Use case unit tests (mock ports)
├── routes/                  # HTTP smoke
└── lib/
```

Detail: **[`docs/architecture.md`](./docs/architecture.md)** · skeleton: **[`docs/architecture/module-skeleton.md`](./docs/architecture/module-skeleton.md)** · fitur baru: **[`docs/architecture/adding-a-feature.md`](./docs/architecture/adding-a-feature.md)**

## 🚀 API Endpoints

### 🔐 Auth

| Method | Path             | Auth?  | Keterangan                                      |
| ------ | ---------------- | ------ | ----------------------------------------------- |
| POST   | `/auth/register` | ❌     | Register password → pending verification (no tokens) |
| POST   | `/auth/verify-email` | ❌ | OTP verify → Auth Session                       |
| POST   | `/auth/resend-verification` | ❌ | Resend OTP (rate-limited)                    |
| POST   | `/auth/login`    | ❌     | Login password (403 if email unverified)        |
| POST   | `/auth/google`   | ❌     | Firebase `idToken` → session (no silent email link) |
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
  email_verified_at            user_id (FK)
  name, role    │
                ├── email_verification_challenges (OTP hash, expiry, attempts)
refresh_tokens ─┘  (jti, token_hash, expires, revoked)

categories / tags / todo_tags — unchanged
```

## 🔐 Authentication Flow

How-to lengkap: **[`docs/auth.md`](./docs/auth.md)**. Ringkas:

### Email + password
1. `POST /auth/register` → user unverified + OTP email; **201** `{ requiresEmailVerification, email }` (**no tokens**)
2. `POST /auth/verify-email` `{ email, code }` → Auth Session
3. `POST /auth/login` — verified → session; unverified → **403 `EMAIL_NOT_VERIFIED`**
4. `POST /auth/resend-verification` — rate-limited; generic 200

### Google
1. Client: Google Sign-In → Firebase exchange → Firebase ID token
2. `POST /auth/google` `{ idToken }` → JWKS verify; **no silent link by email** (409 if email taken)
3. New Google users created verified; session shape sama

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

**Response `201`** (pending — no tokens)
```json
{
  "success": true,
  "data": {
    "requiresEmailVerification": true,
    "email": "budi@yahoo.com"
  },
  "requestId": "req_abc123"
}
```

#### `POST /auth/verify-email`

**Request**
```json
{
  "email": "budi@yahoo.com",
  "code": "123456"
}
```

**Response `200`** — Auth Session (`user` + `accessToken` + `refreshToken` + `expiresIn`; `user.emailVerified: true`).

#### `POST /auth/login`

**Request**
```json
{
  "email": "budi@yahoo.com",
  "password": "rahasia123"
}
```

**Response `200`** — Auth Session (hanya jika email verified).

**Response `403`** (password OK, belum verify)
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Email not verified"
  },
  "requestId": "req_abc123"
}
```

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
  "idToken": "<firebase-id-token>"
}
```

**Response `200`** — session; `user.firebaseUid` terisi; `emailVerified: true`.

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
    "emailVerified": true,
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
| `db:migrate:local`   | Jalankan migration ke D1 lokal (incl. auth + email) |
| `db:migrate:prod`    | Jalankan migration ke D1 production           |
| `db:migrate:email:local` | Migration email verification saja (local)  |
| `db:migrate:email:prod`  | Migration email verification saja (prod)   |
| `db:seed`            | Generate INSERT seed (email_verified_at set)  |
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
| `EMAIL_PROVIDER`      | `log` (default, OTP di wrangler log) \| `resend`       |
| `RESEND_API_KEY`      | API key Resend (wajib jika `EMAIL_PROVIDER=resend`)    |
| `EMAIL_FROM`          | Sender terverifikasi, mis. `Todo <noreply@domain>`     |
| `ENVIRONMENT`         | `development` / `production`                           |

Set secrets via `.dev.vars` (local) atau `wrangler secret put` (prod):

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
# EMAIL_PROVIDER=resend + EMAIL_FROM di wrangler.toml / vars
npm run db:migrate:email:prod
```

## 📋 Logging (HTTP errors only)

Logger service **khusus error HTTP (4xx / 5xx)** — bukan general app logging.

- Type selalu `http_error` → mudah di-filter di `wrangler tail`
- **4xx** → `warn`, **5xx** → `error` (+ stack singkat untuk unhandled)
- Docs lengkap: **[`docs/logger.md`](./docs/logger.md)**

```bash
npx wrangler tail --search 'http_error'
npx wrangler tail --search '"level":"error"'   # 5xx saja
```

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

## 🏗️ Architecture

**Modular Application Architecture** (modular monolith):

```
HTTP → modules/*/http → modules/*/application (use cases)
                      → modules/*/infrastructure (D1, R2, …)
         ↑
  platform/ + app/container.ts (composition root)
```

| Layer | Tanggung jawab |
|-------|----------------|
| `modules/*/http` | Routing, Zod, middleware chain, response envelope |
| `modules/*/application` | Business rules / use cases (ports only) |
| `modules/*/infrastructure` | Drizzle/D1, R2, JWT adapters |
| `app/container.ts` | Satu tempat wire dependency |
| `platform/` | AppError, auth guards, logging, request-id |

Dokumen:

| File | Isi |
|------|-----|
| [`docs/architecture.md`](./docs/architecture.md) | As-built architecture |
| [`docs/architecture/module-skeleton.md`](./docs/architecture/module-skeleton.md) | Template folder module |
| [`docs/architecture/adding-a-feature.md`](./docs/architecture/adding-a-feature.md) | Alur fitur: table → endpoint → FE |
| [`docs/auth.md`](./docs/auth.md) | Auth flows |
| [`docs/adr/`](./docs/adr/) | Keputusan desain |
