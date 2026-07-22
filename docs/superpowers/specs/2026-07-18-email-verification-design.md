> **HISTORICAL** — design/plan trail. Path & layout di dokumen ini bisa usang. Kode sekarang: `docs/architecture.md`.

# Email Verification — Design Spec

**Date:** 2026-07-18  
**Status:** Implemented  
**Author:** Brainstorming session (Rizky + agent)  
**Scope:** Service + apps (full polish)  
**Related:** [auth.md](../../auth.md), [ADR 0001–0004](../../adr/), [CONTEXT.md](../../../../CONTEXT.md)

---

## 1. Goal

Mencegah **pre-hijack email**: siapa pun tidak boleh “memesan” email orang lain lewat register password lalu membuat pemilik asli (mis. lewat Google) masuk ke akun / data yang bukan miliknya.

Setelah fitur ini:

1. Register email/password **membuktikan kepemilikan inbox** lewat **OTP 6 digit** sebelum Auth Session penuh.
2. Login password **hard gate**: unverified → tidak ada access/refresh token.
3. Google **tidak silent-link** ke User yang sudah ada by email.
4. Existing users ikut hard gate (harus verify sebelum login password).

---

## 2. Non-goals

- Magic link / universal deep link
- Forgot-password / reset password (boleh reuse pola challenge nanti)
- Endpoint eksplisit “link Google setelah password login” (phase terpisah)
- “Google wins” / auto-delete akun unverified penyerang
- Full i18n framework (react-i18next, dll.)
- MFA

---

## 3. Decisions (locked)

| # | Keputusan |
|---|-----------|
| 1 | **Hard gate** — no full Auth Session for password path until verified |
| 2 | **OTP 6 digit** + pluggable `EmailSender` (log dev, Resend prod) |
| 3 | **No silent account linking** on Google |
| 4 | **Full polish** — service + FE verify UI + production email + rate limit UX |
| 5 | **Migrasi B** — all existing users `email_verified_at = null` |
| 6 | **Pendekatan 2** — kolom `email_verified_at` + tabel `email_verification_challenges` |

---

## 4. Architecture

```text
Register (password)
  → create User (email_verified_at null)
  → create challenge (hash OTP)
  → EmailSender.send OTP
  → 201 { requiresEmailVerification, email }   // NO tokens

Verify OTP
  → validate challenge
  → set email_verified_at
  → issueSession → Auth Session

Login password
  → if unverified → 403 EMAIL_NOT_VERIFIED
  → if verified → issueSession

Google
  → verify Firebase token (require email_verified claim)
  → by firebase_uid → session (+ backfill email_verified_at if null)
  → else email free → create verified Google user → session
  → else email taken → 409 (no link)
```

Prinsip yang tidak berubah: **Identity proof ≠ Auth Session**; session tetap JWT service (ADR 0001).

---

## 5. Data model

### 5.1 `users` — kolom baru

| Column | Type | Notes |
|--------|------|--------|
| `email_verified_at` | `text` NULL | ISO timestamp; `null` = belum verified |

**Migrasi:** tambah kolom nullable; **jangan** backfill. Semua row existing = unverified.

### 5.2 Tabel `email_verification_challenges`

| Column | Type | Notes |
|--------|------|--------|
| `id` | text PK | UUID |
| `user_id` | text FK → users ON DELETE CASCADE | |
| `code_hash` | text NOT NULL | hash OTP (never plain) |
| `expires_at` | text NOT NULL | create + **10 minutes** |
| `attempt_count` | integer NOT NULL DEFAULT 0 | max **5** failures |
| `created_at` | text NOT NULL | |
| `consumed_at` | text NULL | set on success |

**Rules:**

- Hanya **satu challenge aktif** per user: create baru → mark/consume/delete prior active challenges for that user.
- OTP: 6 digit, CSPRNG; compare timing-safe on hash.
- On successful verify: set `consumed_at`, set `users.email_verified_at = now()`.

### 5.3 Public User

```ts
type PublicUser = {
  // ...existing fields
  emailVerified: boolean; // derived: email_verified_at != null
};
```

Jangan expose `email_verified_at` di FE kecuali dibutuhkan nanti.

---

## 6. API

### 6.1 `POST /auth/register`

**Behavior change:** tidak lagi return Auth Session.

1. Email exists → 409 (existing behavior OK).
2. Create user: `password_hash` set, `firebase_uid` null, `email_verified_at` null.
3. Create challenge + send OTP.
4. **201:**

```json
{
  "success": true,
  "data": {
    "requiresEmailVerification": true,
    "email": "user@example.com"
  },
  "requestId": "..."
}
```

### 6.2 `POST /auth/verify-email`

Body: `{ "email": string, "code": string }`

1. Find user by email; no user → 401 `INVALID_OTP` (generic; avoid email enum if possible) **or** same as invalid code.
2. Load active challenge (not consumed, not expired).
3. If expired → 401 `OTP_EXPIRED`.
4. If `attempt_count >= 5` → 429 `OTP_MAX_ATTEMPTS`.
5. If code mismatch → increment attempts → 401 `INVALID_OTP`.
6. Success → consume challenge, set `email_verified_at`, **issueSession** → 200 Auth Session.

### 6.3 `POST /auth/resend-verification`

Body: `{ "email": string }`

1. Rate limit: **60s cooldown** per email; **max 5 / hour** per email (server).
2. If user missing or already verified → **200 generic** `{ ok: true }` (no leak).
3. If unverified → invalidate old challenges, create new, send OTP → 200 `{ ok: true }`.
4. Over limit → 429 `RATE_LIMITED`.

### 6.4 `POST /auth/login`

After password OK:

- If `email_verified_at` null → **403** `{ code: "EMAIL_NOT_VERIFIED", message: "..." }` — **no tokens**.
- Else → issueSession as today.

Wrong password / missing user → tetap 401 Invalid credentials (jangan bocorkan verified state jika user tidak ada).

### 6.5 `POST /auth/google`

| Condition | Result |
|-----------|--------|
| Token invalid / no email | 401 |
| `email_verified !== true` on Firebase claims | 401 |
| User by `firebase_uid` | Session; if `email_verified_at` null → set now |
| No uid match; email **free** | Create user (`password_hash` null, `firebase_uid` set, `email_verified_at` now) → session |
| Email exists, `firebase_uid` null | **409** `EMAIL_REGISTERED_USE_PASSWORD` — **do not** set firebase_uid |
| Email exists, `firebase_uid` different | **409** `IDENTITY_CONFLICT` |

**Removed:** auto-link by email when `firebase_uid` was null.

### 6.6 Error codes (stable for FE)

| Code | HTTP | When |
|------|------|------|
| `EMAIL_NOT_VERIFIED` | 403 | Password login, unverified |
| `INVALID_OTP` | 401 | Wrong code / opaque failure |
| `OTP_EXPIRED` | 401 | Challenge expired / missing active |
| `OTP_MAX_ATTEMPTS` | 429 | Too many wrong codes |
| `RATE_LIMITED` | 429 | Resend/verify throttled |
| `EMAIL_REGISTERED_USE_PASSWORD` | 409 | Google, email owned by password account |
| `IDENTITY_CONFLICT` | 409 | Google uid mismatch |
| `EMAIL_ALREADY_REGISTERED` | 409 | Register duplicate (optional explicit code) |

---

## 7. Email delivery

```ts
interface EmailSender {
  sendEmailVerificationOtp(input: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
}
```

| Provider | When |
|----------|------|
| `LogEmailSender` | `EMAIL_PROVIDER=log` (default local/test) |
| `ResendEmailSender` | `EMAIL_PROVIDER=resend` + production |

**Env:**

| Variable | Purpose |
|----------|---------|
| `EMAIL_PROVIDER` | `log` \| `resend` |
| `RESEND_API_KEY` | Resend secret |
| `EMAIL_FROM` | Verified sender, e.g. `Todo <noreply@domain>` |

**Template (ID):** subject “Kode verifikasi”, body berisi kode + masa berlaku 10 menit.  
**Security:** never put OTP in API responses; avoid logging OTP in production Resend path (LogEmailSender may log in dev only).

---

## 8. Client (apps)

### 8.1 Flows

```text
Register success
  → do NOT commitSession
  → router → /(auth)/verify-email?email=...

Verify success
  → commitSession → replace /(main)/home

Login 403 EMAIL_NOT_VERIFIED
  → navigate verify-email (prefill email) + optional resend

Resend
  → POST /auth/resend-verification
  → UI cooldown 60s
  → handle RATE_LIMITED

Google 409 EMAIL_REGISTERED_USE_PASSWORD | IDENTITY_CONFLICT
  → Alert explaining use password / contact support
```

### 8.2 Files (expected)

| Path | Role |
|------|------|
| `src/app/(auth)/verify-email.tsx` | OTP UI + resend |
| `src/features/auth/hooks/useVerifyEmail.ts` | mutation |
| `src/features/auth/hooks/useResendVerification.ts` | mutation |
| `src/features/auth/api/auth.api.ts` | new methods; register return type |
| `src/features/auth/types.ts` | `RegisterPendingVerification`, codes |
| `src/features/auth/auth-copy.ts` | ID strings (centralized, no full i18n lib) |
| login / register screens | navigation + error handling |

### 8.3 Types

```ts
type RegisterPendingVerification = {
  requiresEmailVerification: true;
  email: string;
};

// register(): Promise<RegisterPendingVerification>
// verifyEmail(): Promise<AuthSession>
```

`PublicUser.emailVerified: boolean` must match backend.

---

## 9. Security invariants

1. Unverified password users never receive access/refresh tokens (register/login).
2. OTP stored only as hash; max attempts + expiry.
3. Resend rate-limited; response does not reveal account existence.
4. No silent Google linking by email.
5. Google requires IdP `email_verified`.
6. Existing users must verify before password login (migration B).
7. Timing-safe OTP compare.

---

## 10. Testing (service)

- Register → 201 pending; no tokens; challenge row exists.
- Verify wrong code → INVALID_OTP; attempts increment.
- Verify expired → OTP_EXPIRED.
- Verify max attempts → OTP_MAX_ATTEMPTS.
- Verify OK → session; `emailVerified` true; challenge consumed.
- Login unverified → 403 EMAIL_NOT_VERIFIED.
- Login verified → session.
- Resend verified/unknown email → 200 generic.
- Resend throttle → 429.
- Google new email → session verified.
- Google email taken (password user) → 409, firebase_uid unchanged.
- Google by existing firebase_uid → session; backfill verified if needed.

FE: manual / light tests for navigation; prioritize service unit/route tests.

---

## 11. Docs & glossary updates (implementation time)

- Update `service/docs/auth.md` (flows, ERD, endpoints).
- Update `apps/docs/auth-flow.md` (verify screen, register change).
- ADR: `0005-email-verification-hard-gate.md`, `0006-no-silent-google-link.md` (or single ADR if preferred).
- `CONTEXT.md` terms: **Email verification**, **Verification challenge** (OTP).

---

## 12. Success criteria

- [ ] Password register cannot use API as authenticated user without OTP.
- [ ] Attacker-registered email cannot be silently taken over via Google login by victim (409 instead).
- [ ] Victim with password account must verify email before login; then owns account.
- [ ] Google-only new users get verified session without OTP email.
- [ ] Production can send OTP via Resend; local uses log provider.
- [ ] FE: register → verify → home path works end-to-end.
- [ ] Tests green for matrix in §10.
- [ ] Auth docs + glossary updated.

---

## 13. Implementation order (hint for plan)

1. Migration + schema + types  
2. OTP hash helper + challenge repo  
3. EmailSender (log + resend)  
4. AuthService: register/login/verify/resend + Google policy  
5. Routes + OpenAPI  
6. Service tests  
7. FE types/api/hooks/screens  
8. Docs + ADR + CONTEXT  
9. Prod env (Resend secrets)

---

## 14. Open items (resolved)

None for phase scope. Explicit Google link endpoint deferred.
