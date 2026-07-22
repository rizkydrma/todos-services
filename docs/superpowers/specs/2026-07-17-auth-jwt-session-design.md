> **HISTORICAL** — design/plan trail. Path & layout di dokumen ini bisa usang. Kode sekarang: `docs/architecture.md`.

# Auth Session JWT — Design Spec

**Date:** 2026-07-17  
**Status:** Revised — password disimpan di D1 (hash)  
**Author:** Rizky Darma  
**Scope:** `service` only (FE wiring out of scope)

> **As-built (cara kerja sekarang):** lihat [`service/docs/auth.md`](../../auth.md)  
> **Client:** [`apps/docs/auth-flow.md`](../../../../apps/docs/auth-flow.md)  
> **ADR:** [`service/docs/adr/`](../../adr/) · **Glossary:** [`CONTEXT.md`](../../../../CONTEXT.md)  
> Dokumen ini tetap **design record / history** phase 1 — jangan diganti jadi runbook.

---

## 1. Goal

Dua cara login, response sama:

1. **Email + password** — password **di-hash & disimpan di D1** (kita yang urus)
2. **Google Sign-In** — verify `idToken`; user Google **tidak wajib** password

Keduanya mengembalikan **`accessToken` + `refreshToken`** (JWT service).  
API: `Authorization: Bearer <accessToken>`.

User email/password **tidak wajib** Google/Gmail.  
User Google **tidak wajib** password.

---

## 2. Non-goals (phase 1)

- Explicit account linking (“hubungkan Gmail”)
- MFA
- Forgot-password email flow (bisa phase 2: token reset di DB)
- Perubahan FE (hanya kontrak API)
- Firebase Identity Toolkit untuk email/password (**tidak dipakai**)

---

## 3. Architecture

```
Email/password:
  Client → POST /auth/register|login { email, password }
  Service → hash/verify password di D1 → issue JWT pair

Google:
  Client → POST /auth/google { idToken }
  Service → verify Firebase/Google JWKS → find/create user D1 → issue JWT pair

API:
  Client → Bearer accessToken (JWT kita)
  401 → POST /auth/refresh { refreshToken }
```

| Layer | Tanggung jawab |
|--------|----------------|
| **D1 `users`** | Profil + **password_hash** (nullable) + firebase_uid (nullable, untuk Google) |
| **D1 `refresh_tokens`** | Session refresh (hash/jti, revoke) |
| **Firebase/Google** | **Hanya** verifikasi Google `idToken` |
| **Service JWT** | access + refresh session |

**Password plain tidak pernah disimpan.** Hanya hash (PBKDF2 via Web Crypto, format PHC-like, cocok Cloudflare Workers tanpa native bcrypt).

---

## 4. Database

### `users` (perubahan)

```
users
  id              text PK
  email           text UNIQUE NOT NULL
  name            text NOT NULL
  role            text NOT NULL DEFAULT 'user'
  password_hash   text NULL          -- null = Google-only / no password
  firebase_uid    text UNIQUE NULL  -- null = email-only, belum pernah Google
  created_at      text NOT NULL
  updated_at      text NOT NULL
```

- Register email/password → `password_hash` terisi, `firebase_uid` null  
- Google first login → `firebase_uid` terisi, `password_hash` null  
- Migration: `firebase_uid` dari NOT NULL → **nullable**; add `password_hash`

### `refresh_tokens` (baru)

```
refresh_tokens
  id           text PK
  user_id      text NOT NULL FK → users.id ON DELETE CASCADE
  jti          text NOT NULL UNIQUE
  token_hash   text NOT NULL
  expires_at   text NOT NULL
  revoked_at   text NULL
  created_at   text NOT NULL
```

---

## 5. Password handling (kita urus)

| Operasi | Behavior |
|---------|----------|
| Register | `password_hash = await hashPassword(password)` |
| Login | load user by email → `verifyPassword(password, hash)` |
| Google-only user login email/password | 401 (belum set password) |
| Hash algo | **PBKDF2-SHA256** (Web Crypto), salt random 16 bytes, iterations tinggi (e.g. 100_000) |
| Storage format | `pbkdf2$iterations$saltB64$hashB64` |

Tidak pakai Firebase untuk create/check password.

---

## 6. Endpoints

### `POST /auth/register`

```json
{ "name": "string", "email": "string", "password": "string min 6" }
```

1. Email sudah ada → 409  
2. Hash password → insert user (`password_hash`, `firebase_uid` null)  
3. Issue tokens → 201  

### `POST /auth/login`

```json
{ "email": "string", "password": "string" }
```

1. User tidak ada / `password_hash` null / password salah → **401** generik (“Invalid credentials”)  
2. Issue tokens → 200  

### `POST /auth/google`

```json
{ "idToken": "string" }
```

1. Verify Firebase/Google JWT (existing JWKS)  
2. Cari by `firebase_uid`, else by email  
3. **Belum ada** → auto-create (`password_hash` null, set `firebase_uid`)  
4. Ada by email, `firebase_uid` null → **link** set `firebase_uid` (same person, first Google)  
5. Ada by email, `firebase_uid` beda → 409 conflict  
6. Issue tokens → 200  

### `POST /auth/refresh`

```json
{ "refreshToken": "string" }
```

Rotate: revoke lama, issue access + refresh baru.

### `POST /auth/logout`

```json
{ "refreshToken": "string" }
```

Revoke; idempotent 200.

### `GET /auth/me`

Bearer **access JWT kita** → user dari D1.

### Breaking

Hapus body `{ token }` lama pada register/login.

---

## 7. Response (login / register / google / refresh)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "a@b.com",
      "name": "Name",
      "role": "user",
      "firebaseUid": null,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "expiresIn": 900
  },
  "requestId": "..."
}
```

`password_hash` **tidak pernah** di response.

---

## 8. JWT

| | Access | Refresh |
|--|--------|---------|
| Claims | `sub`=userId, `role`, `email`, `type=access` | `sub`, `type=refresh`, `jti` |
| TTL | 15 menit | 7 hari |
| Alg | HS256 | HS256 |
| Secret | `JWT_SECRET` | same |

Middleware: verify access JWT → load user by `sub` → attach context.  
Bukan verify Firebase token untuk protected routes.

---

## 9. Env

| Var | Purpose |
|-----|---------|
| `JWT_SECRET` | Sign access/refresh (secret) |
| `FIREBASE_PROJECT_ID` | Verify Google idToken only |
| `DB` | D1 |

`FIREBASE_API_KEY` **tidak wajib** untuk auth email/password lagi (seed script bisa diubah terpisah).

---

## 10. Security

- HTTPS only in production  
- Generic 401 on bad login (no “email exists” leak on login)  
- Register may return 409 email exists (acceptable phase 1)  
- Refresh rotation + revoke on logout  
- Rate limit existing  
- Never log password  
- `password_hash` never in API responses  

---

## 11. Code structure

```
src/lib/password.ts           # hash + verify (Web Crypto PBKDF2)
src/lib/jwt.ts                # sign/verify access + refresh
src/lib/firebase.ts           # Google idToken verify only
src/services/auth.service.ts
src/repositories/.../refresh-token.repo.ts
src/middleware/auth.middleware.ts
src/routes/auth.routes.ts
src/db/schema.ts              # password_hash, firebase_uid nullable
drizzle/0001_....sql
```

---

## 12. Testing

- hash/verify password unit tests  
- register → hash stored, login ok, wrong password 401  
- Google auto-create without password  
- JWT middleware rejects invalid token  
- refresh rotate + logout  

---

## 13. Success criteria

- [ ] Register email non-Google + password → hash di D1, dapat tokens  
- [ ] Login email/password tanpa Firebase token client  
- [ ] Google login tanpa password, auto-register  
- [ ] Protected routes pakai access JWT kita  
- [ ] Refresh + logout  
- [ ] Tests green  
