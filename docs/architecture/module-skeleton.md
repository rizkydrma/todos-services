# Module Skeleton

Standar **wajib** untuk setiap business module. Ikuti ini — jangan invent struktur baru.

Alur end-to-end fitur baru (DB → API → FE): [`adding-a-feature.md`](./adding-a-feature.md).

---

## Tree

```
src/modules/<name>/
├── domain/
│   └── <name>.ts
├── application/
│   ├── ports.ts
│   ├── list-*.ts / get-*.ts / create-*.ts / …
├── infrastructure/
│   └── d1-<name>.repository.ts   # atau adapter non-D1
├── http/
│   ├── routes.ts
│   └── schemas.ts
├── container.ts                  # build<Name>UseCases(deps)
└── index.ts                      # public API only
```

---

## Use case shape

```ts
// application/get-thing.ts
export function getThing(deps: { repo: IThingRepository }) {
  return async (input: { id: string; userId: string }) => {
    const row = await deps.repo.findById(input.id)
    if (!row) throw AppError.notFound('Thing')
    // ownership / rules …
    return row
  }
}
```

---

## HTTP shape

```ts
export function createThingsRoutes() {
  const r = new Hono<AppEnv>()
  r.get('/:id', requireAuth, async (c) => {
    const { things } = c.get('container')
    const user = c.get('user')
    return success(c, await things.get({ id: c.req.param('id'), userId: user.id }))
  })
  return r
}
```

Tidak boleh `new D1*` di handler.

---

## Wire

**`app/container.ts`** — satu-satunya tempat `new` infrastructure:

```ts
things: buildThingsUseCases({ repo: new D1ThingRepository(db), ids })
```

**`routes/index.ts`:**

```ts
app.route('/things', createThingsRoutes())
```

**`index.ts` module** — export routes factory, use case builder, types/ports.  
Jangan export class D1.

---

## Checklist PR

- [ ] Folder domain / application / infrastructure / http
- [ ] Use case per aksi (bukan satu god-class)
- [ ] `http` tidak import `infrastructure`
- [ ] `application` tidak import Hono / Drizzle
- [ ] Error = `AppError`; response = platform envelope
- [ ] Wired di container + routes
- [ ] Test application dengan mock ports

---

## Anti-pattern

| Jangan | Kenapa |
|--------|--------|
| `services/*.ts` global | Pola lama, ditinggalkan |
| Export repository dari `index.ts` ke module lain | Coupling; pakai narrow port + container |
| Port untuk pure string format | Theater |
| Business rule di route | Boundary bocor |
