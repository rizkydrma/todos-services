# Testing Strategy

**Status:** Current (as-built)

## Stack

- **Vitest**
- Mock ports dengan `vi.fn()` (`tests/setup.ts`)

## Layout

```
tests/
├── setup.ts                      # fixtures + createMock*Repo
├── modules/
│   ├── auth/application/
│   ├── todos/application/
│   ├── categories/application/
│   ├── tags/application/
│   └── uploads/application/
├── routes/                       # createApp() smoke (401/400)
└── lib/                          # platform + pure helpers
```

## Aturan

| Layer | Apa di-mock | Jangan |
|-------|-------------|--------|
| `application` use cases | Ports (repo, email, …) | Jangan butuh D1/R2 nyata |
| `routes` | — (app request tanpa env OK untuk guard/validation) | Jangan assert business logic di sini |
| `lib` / platform | Minimal | — |

## Pattern

```ts
const mockTodoRepo = createMockTodoRepo()
const run = getTodo({ todoRepo: mockTodoRepo })
mockTodoRepo.findById.mockResolvedValue(null)
await expect(run({ id: 'x', userId: 'u' })).rejects.toThrow(/not found/i)
```

Auth: `buildAuthUseCases({ ...mocks, tokens: new JwtTokenService(secret), ... })`.

## Menjalankan

```bash
bun run test
bun run test:watch
bun run test:coverage
```
