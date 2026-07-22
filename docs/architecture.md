# Architecture — Todo Service

Dokumentasi **as-built** arsitektur backend. Selaras dengan kode di `src/` (Juli 2026).

| Dokumen | Peran |
|---------|--------|
| **Ini** | Pola & struktur kode sekarang |
| [`architecture/module-skeleton.md`](./architecture/module-skeleton.md) | Template folder module |
| [`architecture/adding-a-feature.md`](./architecture/adding-a-feature.md) | **Alur fitur baru: table → endpoint → response FE** |
| [`auth.md`](./auth.md) | Alur auth end-to-end |
| [`logger.md`](./logger.md) | HTTP error logging |
| [`adr/`](./adr/) | Keputusan desain (mengapa) |

---

## 1. Ringkasan

**Modular Application Architecture** — modular monolith di Cloudflare Workers:

```
HTTP → platform (middleware) → modules/*/http
                              → modules/*/application (use cases)
                              → modules/*/infrastructure (D1, R2, …)
                              ↑
                     app/container.ts (composition root)
```

| Layer | Isi |
|-------|-----|
| `app/` | Worker entry, `createApp`, **satu** `buildContainer(env)` |
| `platform/` | Error, envelope, request-id, error handler, auth middleware, logger |
| `modules/*` | Fitur: domain · application · infrastructure · http |
| `lib/` | Adapter shared (JWT, password, OTP, Firebase, R2, email, pagination) |
| `db/` | Drizzle schema + client |
| `shared/` | Port generik tipis (`IdGenerator`) |
| `routes/` | Hanya `registerRoutes` — mount module routers |
| `types/` | Shared domain types + Zod schemas HTTP |

**Bukan:** technical folders global (`services/`, `repositories/`), god-service class, microservices-first.

---

## 2. Struktur `src/`

```
src/
├── index.ts                 # re-export worker
├── app/
│   ├── worker.ts            # export default app
│   ├── create-app.ts        # Hono + middleware + routes + onError
│   └── container.ts         # buildContainer(env) → AppContainer
├── platform/
│   ├── errors/app-error.ts
│   ├── http/                # envelope, request-id, error-handler
│   ├── auth/                # requireAuth, requireAdmin
│   └── observability/       # http_error logger
├── modules/
│   ├── auth/
│   ├── todos/
│   ├── categories/
│   ├── tags/
│   ├── uploads/
│   └── users/
├── lib/                     # jwt, password, otp, firebase, r2, email, …
├── db/
├── shared/ports/
├── routes/index.ts
├── types/
└── openapi/spec.ts
```

Setiap module (contoh `todos`):

```
modules/todos/
├── domain/
├── application/          # use cases + ports.ts
├── infrastructure/       # D1*Repository, adapters
├── http/                 # routes.ts, schemas.ts
├── container.ts          # buildTodosUseCases(deps)
└── index.ts              # public API saja
```

Detail copy-paste: [`module-skeleton.md`](./architecture/module-skeleton.md).

---

## 3. Aturan dependensi

```
http        → application, domain, platform
application → domain, ports, platform/errors, shared
infrastructure → ports, domain, db, lib
app/container → infrastructure + build*UseCases  (satu-satunya yang new D1*)
platform    → shared/types;  tidak import modules (kecuali lewat container di runtime)
modules/A   → modules/B hanya via public types + port di-wire di container
```

**Dilarang:**

- Handler `new D1*Repository` / business SQL
- Application import Hono / `c.env` / Drizzle
- Export class infrastructure dari `modules/*/index.ts`
- Folder `services/` atau `repositories/` global

---

## 4. Request lifecycle

```
request
  → requestIdMiddleware
  → cors
  → buildContainer(c.env) → c.set('container')
  → route + requireAuth? / requireAdmin? / zValidator?
  → use case via c.get('container').<module>.*
  → success() / throw AppError
  → errorHandler → JSON envelope + http_error log
```

Handler tipikal:

```ts
const { todos } = c.get('container')
const user = c.get('user')
const result = await todos.get({ id, userId: user.id })
return success(c, result)
```

---

## 5. Modules

| Module | Tanggung jawab |
|--------|----------------|
| `auth` | Register, OTP, login password/Google, refresh rotation, logout, profile, `resolveAccessUser` |
| `todos` | CRUD + batch; ownership user |
| `categories` / `tags` | Master data (read auth, write admin) |
| `uploads` | Presign R2 single + multipart |
| `users` | Admin list/get/role/delete (share `D1UserRepository` dengan auth di container) |

Cross-module (contoh create todo butuh category exists): **narrow port** di application todos; impl di-wire dari repo categories di `app/container.ts`.

---

## 6. AppContainer

```ts
type AppContainer = {
  auth: AuthUseCases
  todos: TodosUseCases
  categories: CategoriesUseCases
  tags: TagsUseCases
  uploads: UploadsUseCases
  users: UsersUseCases
}
```

- Dibangun **per request** dari `c.env` (Workers-safe).
- Tanpa `DB`/`JWT_SECRET` (route unit test tanpa binding): stub yang throw hanya jika use case dipanggil — auth/validation tetap bisa diuji.

---

## 7. Cross-cutting

| Concern | Lokasi |
|---------|--------|
| Envelope `{ success, data\|error, requestId }` | `platform/http/envelope.ts` |
| `AppError` + codes | `platform/errors/app-error.ts` |
| Bearer JWT → `PublicUser` | `requireAuth` → `container.auth.resolveAccessUser` |
| Admin role | `requireAdmin` |
| HTTP error log (4xx/5xx only) | `platform/observability` — lihat `logger.md` |
| Zod validation | boundary HTTP (`zValidator`) |

Response sukses/error: lihat README.

---

## 8. Auth (ringkas)

Identity proof (password / Firebase idToken) **hanya** di login.  
Protected routes: **access JWT service** + user di D1.

Detail: [`auth.md`](./auth.md). ADR 0001–0006.

---

## 9. Testing

```
tests/
├── setup.ts                 # fixtures + mock factories
├── modules/*/application/   # use cases + mock ports
├── routes/                  # HTTP smoke (createApp)
└── lib/                     # pure helpers (platform/lib)
```

- Application: mock ports, tanpa D1.
- Routes: app tanpa env → cek 401/400; jangan butuh container penuh.

---

## 10. Menambah fitur

Panduan lengkap (table → migration → module → container → OpenAPI → tests → FE):

**→ [`architecture/adding-a-feature.md`](./architecture/adding-a-feature.md)**

Ringkas:

1. Copy skeleton → `src/modules/<name>/` ([module-skeleton.md](./architecture/module-skeleton.md))
2. Schema/migration di `db/`
3. Ports + use cases + infrastructure + http
4. Wire `app/container.ts` + `routes/index.ts`
5. OpenAPI + tests

**Besar = lebih banyak module**, bukan ganti pola arsitektur.

---

## 11. ADR

| ADR | Inti |
|-----|------|
| 0001 | Session = JWT service, bukan token IdP di setiap request |
| 0002 | Password hash di D1 |
| 0003 | Google via Firebase ID token |
| 0004 | Refresh rotation + revoke |
| 0005 | Email verification hard gate |
| 0006 | No silent Google link by email |
| 0007 | Modular monolith + use cases/ports (template kecil→besar) |

---

## 12. Onboarding baca kode

1. `app/create-app.ts` + `app/container.ts`
2. `modules/todos/` (pola paling sederhana)
3. `platform/auth/require-auth.ts` + `modules/auth/`
4. `docs/auth.md` bila sentuh login/session
