# HTTP Error Logger

Dokumentasi singkat supaya tidak lupa: **logger service ini khusus untuk error HTTP (4xx / 5xx)**, bukan general-purpose logging.

| | |
|---|---|
| **File** | `src/lib/logger.ts` |
| **Dipakai dari** | `src/middleware/error.middleware.ts`, `src/lib/response.ts` (`error()`) |
| **Output** | `console.warn` / `console.error` → **wrangler tail** + **Cloudflare Workers Observability** |
| **Type log** | selalu `"type": "http_error"` |

---

## Apa yang di-log / apa yang tidak

| Di-log | Tidak di-log |
|--------|----------------|
| Request gagal **4xx** (401, 403, 404, 409, 429, validation, …) | Request **2xx / 3xx** sukses |
| Request gagal **5xx** (unhandled / internal) | Startup, cron, background (belum ada logger terpisah) |
| Field terstruktur: method, path, status, code, message, requestId | Body request / password / token penuh |

**Ingat:** ini **HTTP error logger**, bukan `log.info("user clicked button")`.  
Kalau butuh access log sukses atau domain event, buat logger lain — jangan campur di `logError` dengan `type: http_error`.

---

## Alur

```
Request gagal
    → throw AppError / ZodError / Error
    → errorHandler (middleware)  atau  response.error()
    → levelForStatus(status)     # 4xx → warn, 5xx → error
    → logError(level, payload)
    → console.warn / console.error
    → wrangler tail / CF dashboard
```

Hampir semua error route lewat **global** `errorHandler` di `app.onError`.  
Helper `error()` di `response.ts` juga memanggil logger yang sama (kalau masih dipakai di route).

---

## Level vs status HTTP

| Status | Level log | `statusClass` | Console |
|--------|-----------|---------------|---------|
| **4xx** | `warn` | `4xx` | `console.warn` |
| **5xx** | `error` | `5xx` | `console.error` |
| lain-lain | `info` | `other` | `console.info` (jarang dipakai di path error) |

Helper: `levelForStatus(status)`.

---

## Format output (setelah rapikan)

Satu event = **header 1 baris** + **JSON pretty** (multi-line).

```text
[error] POST /auth/google 500 INTERNAL_ERROR
{
  "level": "error",
  "type": "http_error",
  "statusClass": "5xx",
  "requestId": "req_ae3660de-...",
  "method": "POST",
  "path": "/auth/google",
  "status": 500,
  "code": "INTERNAL_ERROR",
  "message": "D1_ERROR: no such table: refresh_tokens: SQLITE_ERROR",
  "stack": [
    "Error: D1_ERROR: no such table: refresh_tokens: SQLITE_ERROR",
    "    at D1RefreshTokenRepository.create (...)",
    "    at AuthService.issueSession (...)"
  ],
  "ts": "2026-07-17T12:10:39.324Z"
}
```

Contoh 4xx:

```text
[warn] POST /auth/google 401 UNAUTHORIZED
{
  "level": "warn",
  "type": "http_error",
  "statusClass": "4xx",
  "requestId": "req_...",
  "method": "POST",
  "path": "/auth/google",
  "status": 401,
  "code": "UNAUTHORIZED",
  "message": "Invalid token signature",
  "ts": "..."
}
```

| Field | Arti |
|-------|------|
| `level` | `warn` / `error` (keparahan log) |
| `type` | Selalu `http_error` — filter utama di tail |
| `statusClass` | `4xx` / `5xx` |
| `requestId` | Korelasi dengan response body `requestId` + header `X-Request-Id` |
| `method` / `path` | Endpoint yang gagal |
| `status` | HTTP status |
| `code` | Kode aplikasi (`UNAUTHORIZED`, `VALIDATION_ERROR`, …) |
| `message` | Pesan error |
| `details` | Opsional (mis. field Zod) |
| `stack` | Hanya **5xx unhandled** — array max **8** frame (bukan string satu baris) |
| `ts` | ISO timestamp |

Header ringkas dibuat oleh `formatSummary()`:

```text
[level] METHOD path status CODE
```

---

## Kode error (`code`) yang sering muncul

Dari `AppError` + handler:

| `code` | Status tipikal | Contoh |
|--------|----------------|--------|
| `VALIDATION_ERROR` | 400 | Body Zod invalid |
| `UNAUTHORIZED` | 401 | Token hilang / invalid / expired |
| `FORBIDDEN` | 403 | Bukan admin / bukan owner |
| `NOT_FOUND` | 404 | Resource tidak ada |
| `CONFLICT` | 409 | Email sudah terdaftar |
| `TOO_MANY_REQUESTS` | 429 | Rate limit |
| `INTERNAL_ERROR` | 500 | Unhandled (D1, JWT secret kosong, bug, …) |

---

## Cara melihat log

### Local / production (CLI)

```bash
cd service

# Semua log Worker
npx wrangler tail

# Hanya error HTTP terstruktur
npx wrangler tail --search 'http_error'

# Hanya 5xx
npx wrangler tail --search '"level":"error"'

# Hanya 4xx
npx wrangler tail --search '"level":"warn"'

# Kode tertentu
npx wrangler tail --search 'UNAUTHORIZED'
npx wrangler tail --search 'INTERNAL_ERROR'

# Path tertentu
npx wrangler tail --search '/auth/google'
```

### Cloudflare Dashboard

Workers → `todo-service` → **Logs / Observability**  
Filter teks sama: `http_error`, `INTERNAL_ERROR`, path, dll.

### Korelasi request

1. Client dapat `requestId` di JSON error response.  
2. Cari id yang sama di tail / dashboard.  
3. Cocokkan dengan header `X-Request-Id` (middleware `request-id`).

---

## Kapan stack muncul?

| Jenis error | `stack` di log? |
|-------------|-----------------|
| `AppError` (expected business/auth error) | Tidak |
| `ZodError` (validation) | Tidak (`details` berisi issue Zod) |
| `Error` / unknown (bug, D1, crypto, …) → 500 | **Ya** (dipotong max 8 baris) |

Jadi kalau di log ada `stack`, biasanya **bug / misconfig infra**, bukan “user salah password”.

---

## Cara menambah log error (kalau perlu)

**Prefer:** `throw AppError.*` di service/route — biar `errorHandler` yang log.

```ts
throw AppError.unauthorized('Invalid token signature');
throw AppError.notFound('Todo');
throw AppError.conflict('Email already registered');
```

**Jangan** panggil `logError` di setiap service kecuali kasus khusus di luar HTTP handler.

Kalau memang harus manual (jarang):

```ts
import { logError, levelForStatus } from '../lib/logger';

logError(levelForStatus(401), {
  requestId,
  method: 'POST',
  path: '/auth/google',
  status: 401,
  code: 'UNAUTHORIZED',
  message: 'Invalid token signature',
});
```

Payload wajib punya: `requestId`, `status`, `code`, `message`.

---

## Yang bukan tanggung jawab logger ini

- Log request sukses (access log)
- Metric/tracing (duration, APM)
- Audit trail bisnis
- Debug `console.log` sembarangan di production

Untuk itu, pola terpisah (type berbeda, atau tool lain). Jangan ubah `type: 'http_error'` untuk hal non-HTTP.

---

## File terkait

| File | Peran |
|------|--------|
| `src/lib/logger.ts` | `logError`, `levelForStatus`, format summary/stack |
| `src/middleware/error.middleware.ts` | Global handler → log + JSON error response |
| `src/lib/response.ts` | `error()` helper (log + response) |
| `src/lib/errors.ts` | `AppError` + status/code map |
| `src/middleware/request-id.ts` | Generate / propagate `requestId` |
| `tests/lib/logger.test.ts` | Unit test format & level |

---

## Cheat sheet (1 menit)

1. Logger = **hanya HTTP error** (`type: http_error`).  
2. **4xx → warn**, **5xx → error**.  
3. Baca tail dengan filter `http_error` atau `INTERNAL_ERROR`.  
4. Cocokkan `requestId` response ↔ log.  
5. Ada `stack` ≈ unhandled / infra; tidak ada stack ≈ AppError yang diharapkan.  
6. Fix error di root cause (secret, migration, token) — logger hanya menampilkan.

Terakhir diselaraskan dengan kode: **Juli 2026** (pretty multi-line + stack frames).
