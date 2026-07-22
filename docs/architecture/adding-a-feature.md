# Menambah Fitur Baru — Dari Table sampai Response FE

Panduan **as-built** (ikuti ini, bukan pola `services/` / `repositories/` global).  
Selaras dengan [`architecture.md`](../architecture.md) dan [`module-skeleton.md`](./module-skeleton.md).

**Audience:** kamu di masa depan / contributor. Narasi Indonesia; identifier & path English.

---

## 1. Ringkasan 30 detik

Satu fitur resource baru = **satu module** (atau use case baru di module existing).

```
1. Putuskan module baru vs extend
2. Schema + migration D1
3. Module: ports → use cases → infrastructure → http
4. Wire app/container.ts + routes/index.ts
5. Zod + OpenAPI
6. Tests
7. FE: Bearer + envelope { success, data|error, requestId }
```

```
FE ──HTTP──► modules/<name>/http
                  │
                  ▼
            application (rules, AppError)
                  │
                  ▼
            infrastructure (D1 / adapters)
                  │
                  ▼
                 D1
```

---

## 2. Module baru atau extend?

| Situasi | Tindakan |
|---------|----------|
| Resource / aggregate baru (comments, notifications, …) | **Module baru** `src/modules/<name>/` |
| Aksi baru pada resource yang sudah ada | Tambah file use case di module existing |
| Butuh data module lain (ownership todo, dll.) | **Narrow port** di `application/ports.ts`; impl di-wire di `app/container.ts` — jangan import class D1 module lain |

---

## 3. Checklist urutan kerja (copy ke PR)

```
[ ] 1. Scope: path API, auth/admin/ownership, field, error codes
[ ] 2. Schema di src/db/schema.ts + migration
[ ] 3. Scaffold src/modules/<name>/ (lihat module-skeleton.md)
[ ] 4. application/ports.ts
[ ] 5. Use cases (satu file per aksi) + AppError
[ ] 6. infrastructure/d1-*.repository.ts (implements ports)
[ ] 7. Zod schemas (types/schemas.ts dan/atau modules/.../http/schemas.ts)
[ ] 8. http/routes.ts — requireAuth?, zValidator, success/created
[ ] 9. container.ts module + field di AppContainer + buildContainer
[ ] 10. Mount di src/routes/index.ts
[ ] 11. Update src/openapi/spec.ts
[ ] 12. tests/modules/<name>/application/*
[ ] 13. bun run test
[ ] 14. (opsional) smoke wrangler dev + FE
```

---

## 4. Langkah detail

### 4.1 Desain singkat (sebelum kode)

Tuliskan dulu:

- Base path: mis. `/comments`
- Method & auth: public / Bearer / admin
- Ownership: milik user? lewat parent resource?
- Kolom table + tipe
- Shape `data` response (tanpa secret/hash)
- Error: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, …

### 4.2 Database

1. Tambah tabel + relations di `src/db/schema.ts`.
2. Generate & apply migration (script di `package.json`, mis. `db:generate` / `db:migrate:local`).

Schema monolit di `db/` — module infrastructure **import table** dari `schema.ts`. Jangan bikin migration runner per module.

### 4.3 Scaffold module

```
src/modules/<name>/
├── domain/
│   └── <name>.ts
├── application/
│   ├── ports.ts
│   ├── list-*.ts
│   ├── get-*.ts
│   ├── create-*.ts
│   ├── update-*.ts
│   └── delete-*.ts
├── infrastructure/
│   └── d1-<name>.repository.ts
├── http/
│   ├── routes.ts
│   └── schemas.ts
├── container.ts              # build<Name>UseCases(deps)
└── index.ts                  # public API only
```

Detail template kode: [`module-skeleton.md`](./module-skeleton.md).

### 4.4 Ports

Di `application/ports.ts` — interface I/O **tanpa** Hono/Drizzle:

```ts
export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>
  create(data: CreateCommentInput): Promise<Comment>
  // ...
}

/** Cross-module — impl di-wire di app/container, bukan import D1 module lain */
export interface ITodoReader {
  findOwned(todoId: string, userId: string): Promise<{ id: string } | null>
}
```

### 4.5 Use cases

Satu aksi = satu file. Factory function + deps:

```ts
export function createComment(deps: {
  commentRepo: ICommentRepository
  todoReader: ITodoReader
  ids: IdGenerator
}) {
  return async (input: { userId: string; todoId: string; body: string }) => {
    const todo = await deps.todoReader.findOwned(input.todoId, input.userId)
    if (!todo) throw AppError.notFound('Todo')

    return deps.commentRepo.create({
      id: deps.ids.next(),
      todoId: input.todoId,
      userId: input.userId,
      body: input.body.trim(),
    })
  }
}
```

- Rules & ownership di sini.
- Error: `throw AppError.*` — **bukan** `c.json`.

### 4.6 Infrastructure

```ts
export class D1CommentRepository implements ICommentRepository {
  constructor(private db: DbClient) {}
  // drizzle query against schema
}
```

Layer ini saja yang boleh tahu SQL/Drizzle untuk resource tersebut.

### 4.7 HTTP: endpoint + validasi + response

**Zod** — body/query di boundary:

```ts
export const createCommentSchema = z.object({
  todoId: z.string().uuid(),
  body: z.string().min(1).max(2000),
})
```

**Routes:**

```ts
export function createCommentsRoutes() {
  const r = new Hono<AppEnv>()

  r.post('/', requireAuth, zValidator('json', createCommentSchema), async (c) => {
    const { comments } = c.get('container')
    const user = c.get('user')
    const body = c.req.valid('json')

    const row = await comments.create({
      userId: user.id,
      todoId: body.todoId,
      body: body.body,
    })

    return created(c, row) // 201
  })

  return r
}
```

| Boleh di route | Tidak boleh di route |
|----------------|----------------------|
| `requireAuth` / `requireAdmin` | Query Drizzle / SQL |
| `zValidator` | Ownership logic panjang |
| `c.get('container')` + use case | `new D1*Repository` |
| `success` / `created` | Format response ad-hoc |

### 4.8 Wire composition root

**`src/app/container.ts`** — satu-satunya tempat `new` adapter:

```ts
comments: buildCommentsUseCases({
  commentRepo: new D1CommentRepository(db),
  todoReader: /* adapter dari todo infra */,
  ids: uuidIdGenerator,
}),
```

- Tambah field di tipe `AppContainer`.
- Isi stub `unbound*` jika pattern container mendukung test tanpa DB.

**`src/routes/index.ts`:**

```ts
app.route('/comments', createCommentsRoutes())
```

**`modules/<name>/index.ts`:** export `create*Routes`, `build*UseCases`, types/ports public.  
**Jangan** export class D1.

### 4.9 OpenAPI

Update `src/openapi/spec.ts` (masih manual) agar Scalar `/docs` sinkron dengan endpoint baru.

### 4.10 Tests

```
tests/modules/<name>/application/
  create-*.test.ts   # mock ports
```

```bash
bun run test
```

Pattern: inject mock repo/port, assert happy path + `AppError` (not found, forbidden, validation).

---

## 5. Bentuk response ke FE (wajib)

Semua endpoint memakai envelope platform.

### Sukses (item)

```json
{
  "success": true,
  "data": { },
  "requestId": "req_..."
}
```

HTTP: `200` via `success(c, data)` · `201` via `created(c, data)`.

### Sukses (list + pagination)

```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  },
  "requestId": "req_..."
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Todo not found"
  },
  "requestId": "req_..."
}
```

FE:

1. Header `Authorization: Bearer <accessToken>` untuk route protected.
2. Baca `success` → `data` atau `error.code` / `error.message`.
3. `401` → alur refresh (`POST /auth/refresh`) lalu retry.
4. Jangan asumsikan format response beda per fitur.

Auth detail: [`docs/auth.md`](../auth.md).

---

## 6. Alur request runtime (end-to-end)

```
FE POST /comments
  → requestIdMiddleware + cors
  → buildContainer(c.env) → c.set('container')
  → requireAuth → JWT → PublicUser
  → zValidator(body)
  → comments.create(...)
       → port checks (ownership, dll.)
       → D1 insert
  → created(c, row)
  → { success: true, data, requestId }

throw AppError di use case
  → errorHandler
  → { success: false, error: { code, message }, requestId }
  → http_error log (lihat logger.md)
```

---

## 7. Contoh peta file (resource `comments`)

| Langkah | File |
|---------|------|
| Schema | `src/db/schema.ts` + `drizzle/*.sql` |
| Ports / use cases | `src/modules/comments/application/*` |
| D1 | `src/modules/comments/infrastructure/d1-comment.repository.ts` |
| HTTP | `src/modules/comments/http/routes.ts` |
| Wire | `src/app/container.ts`, `src/routes/index.ts` |
| Zod (opsional shared) | `src/types/schemas.ts` |
| OpenAPI | `src/openapi/spec.ts` |
| Tests | `tests/modules/comments/application/*` |

---

## 8. Anti-pattern (tolak di review)

| Jangan | Kenapa |
|--------|--------|
| Logic + SQL di route | Bypass architecture |
| God-class `*Service` multi-method satu file | Kembali ke pola lama |
| Import `D1XRepository` lintas module | Coupling; pakai narrow port + container |
| Response tanpa envelope `success` | FE inkonsisten |
| Skip migration | Local/prod drift |
| Skip OpenAPI | Kontrak FE/docs buram |
| Export infrastructure dari `index.ts` module | Batas public API bocor |

---

## 9. Referensi cepat

| Butuh | Baca |
|-------|------|
| Pola keseluruhan | [`docs/architecture.md`](../architecture.md) |
| Template folder/file | [`module-skeleton.md`](./module-skeleton.md) |
| Auth / session | [`docs/auth.md`](../auth.md) |
| Error log | [`docs/logger.md`](../logger.md) |
| Keputusan “mengapa” | [`docs/adr/`](../adr/) |
| Testing | [`docs/superpowers/testing-strategy.md`](../superpowers/testing-strategy.md) |

---

*Kalau alur ini berubah secara material (mis. schema per-module, OpenAPI auto-gen), update dokumen ini di PR yang sama.*
