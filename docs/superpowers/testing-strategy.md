# Testing Strategy — Unit & Integration Tests

**Date:** 2026-07-15  
**Status:** Draft  

---

## Framework & Tools

- **Vitest** — test runner (ESM native, Workers compat)
- **@cloudflare/vitest-pool-workers** — Workers runtime for route tests
- **Repository Mocks** — `vi.fn()` untuk mock interface

## Scope

Service layer (business logic) + Route layer (request/response/integration) + Lib utilities.

## Test Structure

```
tests/
├── setup.ts                  # Mock factory, fixtures, helpers
├── services/
│   ├── auth.service.test.ts
│   ├── todos.service.test.ts
│   ├── categories.service.test.ts
│   └── tags.service.test.ts
├── routes/
│   ├── auth.routes.test.ts
│   ├── todos.routes.test.ts
│   ├── categories.routes.test.ts
│   └── tags.routes.test.ts
└── lib/
    ├── errors.test.ts
    └── pagination.test.ts
```

## Pattern: Mock Repository

```ts
// Setiap test membuat mock repository yang mengimplement interface
const mockUserRepo: IUserRepository = {
  findByFirebaseUid: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByEmail: vi.fn(),
  findMany: vi.fn(),
};

// Service di-inject dengan mock
const authService = new AuthService(mockUserRepo);
```

## Coverage Per Layer

### Services

| Service | Test Case |
|---------|-----------|
| AuthService | Register sukses, register conflict, login sukses, login not found, getProfile sukses, getProfile sync email |
| TodoService | Create validasi category/tag, update forbidden access, batch complete-all, batch delete-completed |
| CategoryService | Create duplicate name, update name conflict, delete not found |
| TagService | Sama seperti CategoryService |

### Routes

| Route | Test Case |
|-------|-----------|
| Auth | Register valid token, register bad body, login success, /me with auth, /me without auth |
| Todos | List dengan filter, create validasi Zod, update partial, delete, batch, auth guard 401 |
| Categories | Read by any auth, write only admin, 403 for non-admin |
| Tags | Sama seperti Categories |

### Lib

| File | Test Case |
|------|-----------|
| errors.ts | AppError factory (validation, conflict, notFound), AppError.toJSON(), status mapping |
| pagination.ts | paginate() with few items, paginate() with exact multiple, paginate() with empty |

## Test Data (Fixtures)

```ts
export const adminUser = {
  id: 'admin-uuid-1',
  firebaseUid: 'firebase-admin-uid',
  email: 'rizky.darmarazak@gmail.com',
  name: 'Rizky Darma',
  role: 'admin' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const sampleTodo = {
  id: 'todo-uuid-1',
  userId: adminUser.id,
  title: 'Test Todo',
  description: null,
  completed: false,
  priority: 'medium' as const,
  dueDate: null,
  categoryId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
```
