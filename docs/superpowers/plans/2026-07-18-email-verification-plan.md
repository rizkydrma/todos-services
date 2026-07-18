# Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hard-gate password auth behind email OTP verification; stop silent Google account linking; ship service + Expo FE + Resend/log email.

**Architecture:** `users.email_verified_at` + table `email_verification_challenges`; AuthService creates hashed OTP challenges and sends via pluggable `EmailSender`; register returns pending (no tokens); verify issues Auth Session; login 403 if unverified; Google never auto-links by email.

**Tech Stack:** Hono, Drizzle/D1, Vitest, jose (existing), Web Crypto, Resend HTTP API, Expo Router + React Query

**Spec:** [`../specs/2026-07-18-email-verification-design.md`](../specs/2026-07-18-email-verification-design.md)

---

## File map

| Path | Responsibility |
|------|----------------|
| `service/drizzle/0002_email_verification.sql` | Migration SQL |
| `service/src/db/schema.ts` | Drizzle: `emailVerifiedAt`, `emailVerificationChallenges` |
| `service/src/lib/otp.ts` | Generate 6-digit OTP + hash/verify |
| `service/src/lib/email/sender.ts` | `EmailSender` interface + log + Resend |
| `service/src/lib/errors.ts` | Extra AppError codes (403/401/429 reasons) |
| `service/src/repositories/interfaces/email-verification-challenge.repo.ts` | Interface |
| `service/src/repositories/d1/email-verification-challenge.repo.ts` | D1 impl |
| `service/src/repositories/interfaces/user.repo.ts` | `emailVerifiedAt` on create/update |
| `service/src/repositories/d1/user.repo.ts` | Pass through new fields |
| `service/src/services/auth.service.ts` | register/login/verify/resend/google |
| `service/src/routes/auth.routes.ts` | New routes + wiring EmailSender |
| `service/src/types/index.ts` | PublicUser.emailVerified, RegisterPending, AppEnv email |
| `service/src/types/schemas.ts` | Zod bodies |
| `service/src/config/env.ts` | EMAIL_* vars (soft validate where optional) |
| `service/src/openapi/spec.ts` | Document endpoints |
| `service/package.json` | migrate scripts for 0002 |
| `service/tests/**` | OTP, auth service, routes |
| `apps/src/features/auth/**` | types, api, hooks, copy, verify screen |
| `apps/src/app/(auth)/verify-email.tsx` | UI |
| `service/docs/auth.md`, `apps/docs/auth-flow.md`, ADR 0005/0006 | Docs |

---

### Task 1: Schema, migration, User types

**Files:**
- Create: `service/drizzle/0002_email_verification.sql`
- Modify: `service/src/db/schema.ts`
- Modify: `service/src/types/index.ts` (`toPublicUser`, `PublicUser`)
- Modify: `service/src/repositories/interfaces/user.repo.ts`
- Modify: `service/tests/setup.ts` (fixtures + `emailVerifiedAt`)
- Modify: `service/package.json` (migrate scripts append 0002)

- [ ] **Step 1: Add migration SQL**

```sql
-- drizzle/0002_email_verification.sql
ALTER TABLE `users` ADD `email_verified_at` text;
--> statement-breakpoint
CREATE TABLE `email_verification_challenges` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `code_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `attempt_count` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  `consumed_at` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_verification_challenges_user_id_idx` ON `email_verification_challenges` (`user_id`);
```

No backfill — all existing users stay unverified.

- [ ] **Step 2: Update Drizzle schema**

In `users` table add:

```ts
emailVerifiedAt: text('email_verified_at'),
```

Add table:

```ts
export const emailVerificationChallenges = sqliteTable('email_verification_challenges', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attemptCount: integer('attempt_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  consumedAt: text('consumed_at'),
});
```

Wire `usersRelations` if needed (`verificationChallenges: many(...)`).

- [ ] **Step 3: PublicUser + toPublicUser**

```ts
export type PublicUser = {
  id: string;
  firebaseUid: string | null;
  email: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerifiedAt != null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type RegisterPendingVerification = {
  requiresEmailVerification: true;
  email: string;
};
```

- [ ] **Step 4: CreateUserInput / UpdateUserInput**

```ts
// CreateUserInput add:
emailVerifiedAt?: string | null;

// UpdateUserInput add:
emailVerifiedAt?: string | null;
```

Ensure D1 `create`/`update` pass fields through (spread already works if schema matches).

- [ ] **Step 5: Fix test fixtures**

Add `emailVerifiedAt: null` (or a fixed ISO for “verified” fixtures used in login tests later) to `adminUser` / `regularUser` in `tests/setup.ts`.

- [ ] **Step 6: package.json migrate scripts**

Append `&& wrangler d1 execute todo-db --local --file=./drizzle/0002_email_verification.sql` (and remote equivalent) to `db:migrate:local` / `db:migrate:prod`. Add:

```json
"db:migrate:email:local": "wrangler d1 execute todo-db --local --file=./drizzle/0002_email_verification.sql",
"db:migrate:email:prod": "wrangler d1 execute todo-db --remote --file=./drizzle/0002_email_verification.sql"
```

- [ ] **Step 7: Typecheck**

Run: `cd service && npx tsc --noEmit`  
Fix any User fixture / create mock mismatches.

- [ ] **Step 8: Commit**

```bash
cd service && git add drizzle/0002_email_verification.sql src/db/schema.ts src/types/index.ts src/repositories/interfaces/user.repo.ts tests/setup.ts package.json
git commit -m "feat(auth): add email_verified_at and verification challenges schema"
```

(If monorepo root is git root, run from root with paths `service/...`.)

---

### Task 2: OTP helper + challenge repository

**Files:**
- Create: `service/src/lib/otp.ts`
- Create: `service/tests/lib/otp.test.ts`
- Create: `service/src/repositories/interfaces/email-verification-challenge.repo.ts`
- Create: `service/src/repositories/d1/email-verification-challenge.repo.ts`
- Create: `service/tests/setup.ts` mock factory for challenge repo

- [ ] **Step 1: Write failing OTP tests**

```ts
// tests/lib/otp.test.ts
import { describe, expect, it } from 'vitest';
import { generateOtpCode, hashOtp, verifyOtp } from '../../src/lib/otp';

describe('otp', () => {
  it('generates 6 digit numeric code', () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verifies matching code', async () => {
    const code = '123456';
    const hash = await hashOtp(code);
    expect(await verifyOtp(code, hash)).toBe(true);
    expect(await verifyOtp('000000', hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd service && npm test -- tests/lib/otp.test.ts`  
Expected: cannot find module / functions.

- [ ] **Step 3: Implement `src/lib/otp.ts`**

```ts
import { bytesToBase64 } from './encoding';

const OTP_DIGITS = 6;

/** CSPRNG 6-digit string, zero-padded. */
export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(OTP_DIGITS, '0');
}

/** SHA-256 hex/base64 of code; sufficient for short-lived OTP with rate limits. */
export async function hashOtp(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(digest);
}

export async function verifyOtp(code: string, codeHash: string): Promise<boolean> {
  const h = await hashOtp(code);
  if (h.length !== codeHash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i)! ^ codeHash.charCodeAt(i)!;
  return diff === 0;
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
```

- [ ] **Step 4: Run OTP tests — PASS**

- [ ] **Step 5: Challenge repo interface + D1**

Interface:

```ts
export type EmailVerificationChallenge = {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: string;
  attemptCount: number;
  createdAt: string;
  consumedAt: string | null;
};

export type CreateChallengeInput = {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: string;
};

export interface IEmailVerificationChallengeRepository {
  create(data: CreateChallengeInput): Promise<EmailVerificationChallenge>;
  /** Active = consumed_at IS NULL, prefer latest by created_at */
  findActiveByUserId(userId: string): Promise<EmailVerificationChallenge | null>;
  consumeAllActiveForUser(userId: string): Promise<void>;
  incrementAttempts(id: string): Promise<EmailVerificationChallenge>;
  consume(id: string): Promise<void>;
}
```

D1: implement with drizzle on `emailVerificationChallenges`.  
`consumeAllActiveForUser`: set `consumed_at = now()` where user_id and consumed_at is null.  
`findActiveByUserId`: where consumed null, order by createdAt desc, limit 1; caller checks expiresAt.

- [ ] **Step 6: Mock factory in tests/setup.ts**

```ts
export function createMockChallengeRepo() {
  return {
    create: vi.fn(),
    findActiveByUserId: vi.fn(),
    consumeAllActiveForUser: vi.fn(),
    incrementAttempts: vi.fn(),
    consume: vi.fn(),
  };
}
```

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(auth): OTP helpers and email verification challenge repository"
```

---

### Task 3: EmailSender (log + Resend)

**Files:**
- Create: `service/src/lib/email/sender.ts`
- Create: `service/tests/lib/email-sender.test.ts` (optional log path)
- Modify: `service/src/types/index.ts` AppEnv Bindings
- Modify: `service/src/config/env.ts` if used at boot

- [ ] **Step 1: Implement interface + factories**

```ts
// src/lib/email/sender.ts
export type SendOtpInput = {
  to: string;
  code: string;
  expiresInMinutes: number;
};

export interface EmailSender {
  sendEmailVerificationOtp(input: SendOtpInput): Promise<void>;
}

export class LogEmailSender implements EmailSender {
  async sendEmailVerificationOtp(input: SendOtpInput): Promise<void> {
    console.info(
      JSON.stringify({
        type: 'email_verification_otp',
        to: input.to,
        code: input.code,
        expiresInMinutes: input.expiresInMinutes,
      }),
    );
  }
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async sendEmailVerificationOtp(input: SendOtpInput): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [input.to],
        subject: 'Kode verifikasi Todo',
        text: `Kode verifikasi Anda: ${input.code}\nBerlaku ${input.expiresInMinutes} menit.\nJika Anda tidak mendaftar, abaikan email ini.`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
  }
}

export function createEmailSender(env: {
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}): EmailSender {
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error('RESEND_API_KEY and EMAIL_FROM required when EMAIL_PROVIDER=resend');
    }
    return new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new LogEmailSender();
}
```

- [ ] **Step 2: Extend AppEnv.Bindings**

```ts
EMAIL_PROVIDER?: string;
RESEND_API_KEY?: string;
EMAIL_FROM?: string;
```

(Optional in wrangler; default log.)

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(auth): pluggable EmailSender (log + Resend)"
```

---

### Task 4: AppError application codes

**Files:**
- Modify: `service/src/lib/errors.ts`
- Modify: `service/tests/lib/errors.test.ts` if present

Spec FE codes must appear in `error.code`. Extend map:

```ts
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_MAX_ATTEMPTS'
  | 'RATE_LIMITED'
  | 'EMAIL_REGISTERED_USE_PASSWORD'
  | 'IDENTITY_CONFLICT'
  | 'EMAIL_ALREADY_REGISTERED';

const statusMap: Record<AppErrorCode, number> = {
  // ...existing...
  EMAIL_NOT_VERIFIED: 403,
  INVALID_OTP: 401,
  OTP_EXPIRED: 401,
  OTP_MAX_ATTEMPTS: 429,
  RATE_LIMITED: 429,
  EMAIL_REGISTERED_USE_PASSWORD: 409,
  IDENTITY_CONFLICT: 409,
  EMAIL_ALREADY_REGISTERED: 409,
};
```

Add static helpers:

```ts
static emailNotVerified(message = 'Email not verified') {
  return new AppError('EMAIL_NOT_VERIFIED', message);
}
// similarly invalidOtp, otpExpired, otpMaxAttempts, rateLimited, emailRegisteredUsePassword, identityConflict
```

- [ ] **Step 1: Implement + unit assert status codes**
- [ ] **Step 2: Commit** `fix(auth): add email verification AppError codes`

---

### Task 5: AuthService — register, login, verify, resend, google

**Files:**
- Modify: `service/src/services/auth.service.ts`
- Modify: `service/tests/services/auth.service.test.ts`

Constructor becomes:

```ts
constructor(
  private userRepo: IUserRepository,
  private refreshTokenRepo: IRefreshTokenRepository,
  private challengeRepo: IEmailVerificationChallengeRepository,
  private emailSender: EmailSender,
  private jwtSecret: string,
  private resendCooldown: Map<string, number[]> = new Map(), // or inject ResendThrottle
) {}
```

Prefer a small `ResendThrottle` class in same file or `lib/resend-throttle.ts` in-memory per isolate (document: multi-isolate eventual consistency OK for phase 1; route rate-limiter is backup).

- [ ] **Step 1: Rewrite failing tests first (TDD)**

Update/add cases:

1. `register` → `{ requiresEmailVerification: true, email }` — **no** accessToken; creates user with `emailVerifiedAt: null`; calls challenge create + emailSender.
2. `register` conflict unchanged.
3. `login` verified user → session (fixture `emailVerifiedAt` set).
4. `login` unverified + good password → `EMAIL_NOT_VERIFIED`.
5. `login` wrong password → Invalid credentials (not EMAIL_NOT_VERIFIED).
6. `verifyEmail` success → session + consume + set verified.
7. `verifyEmail` wrong code → INVALID_OTP + incrementAttempts.
8. `verifyEmail` expired → OTP_EXPIRED.
9. `verifyEmail` max attempts → OTP_MAX_ATTEMPTS.
10. `resendVerification` creates new challenge.
11. `loginWithGoogle` new email → create with `emailVerifiedAt` set; require `emailVerified: true` on decoded.
12. `loginWithGoogle` email taken password user → EMAIL_REGISTERED_USE_PASSWORD; no update firebase.
13. `loginWithGoogle` by firebase_uid → session; backfill verified if null.

Inject mock `EmailSender` `{ sendEmailVerificationOtp: vi.fn() }` and mock challenge repo.

- [ ] **Step 2: Run tests — FAIL**

- [ ] **Step 3: Implement AuthService methods**

**register:**

```ts
async register(...): Promise<RegisterPendingVerification> {
  // existing email check → AppError with EMAIL_ALREADY_REGISTERED or conflict()
  // create user passwordHash, emailVerifiedAt: null, firebaseUid: null
  // await this.issueChallengeAndSend(user)
  // return { requiresEmailVerification: true, email }
}
```

**issueChallengeAndSend(user):**

```ts
await this.challengeRepo.consumeAllActiveForUser(user.id);
const code = generateOtpCode();
const codeHash = await hashOtp(code);
const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
await this.challengeRepo.create({ id: uuidv4(), userId: user.id, codeHash, expiresAt });
await this.emailSender.sendEmailVerificationOtp({
  to: user.email,
  code,
  expiresInMinutes: 10,
});
```

**login:** after password OK:

```ts
if (!user.emailVerifiedAt) throw AppError.emailNotVerified('Email not verified');
return this.issueSession(user);
```

**verifyEmail(email, code):**

```ts
const user = await this.userRepo.findByEmail(email.trim().toLowerCase());
if (!user) throw AppError.invalidOtp('Invalid or expired code');
if (user.emailVerifiedAt) {
  // already verified: optionally issue session or 200 session
  return this.issueSession(user);
}
const ch = await this.challengeRepo.findActiveByUserId(user.id);
if (!ch) throw AppError.otpExpired('Code expired');
if (new Date(ch.expiresAt).getTime() < Date.now()) throw AppError.otpExpired('Code expired');
if (ch.attemptCount >= OTP_MAX_ATTEMPTS) throw AppError.otpMaxAttempts('Too many attempts');
const ok = await verifyOtp(code, ch.codeHash);
if (!ok) {
  await this.challengeRepo.incrementAttempts(ch.id);
  throw AppError.invalidOtp('Invalid or expired code');
}
await this.challengeRepo.consume(ch.id);
const verified = await this.userRepo.update(user.id, {
  emailVerifiedAt: new Date().toISOString(),
});
return this.issueSession(verified);
```

**resendVerification(email):**

```ts
// throttle: track timestamps in Map by email; if last < 60s → RATE_LIMITED
// if count in last hour >= 5 → RATE_LIMITED
const user = await this.userRepo.findByEmail(...);
if (!user || user.emailVerifiedAt) return { ok: true };
await this.issueChallengeAndSend(user);
return { ok: true };
```

**loginWithGoogle(decoded):**

```ts
if (!decoded.email?.trim()) throw AppError.unauthorized('Google token missing email');
if (!decoded.emailVerified) throw AppError.unauthorized('Google email not verified');
// findByFirebaseUid → session; if !emailVerifiedAt update now
// findByEmail:
//   if byEmail.firebaseUid && !== decoded → IDENTITY_CONFLICT
//   if byEmail (any, including firebaseUid null) → EMAIL_REGISTERED_USE_PASSWORD  // NO silent link
// else create verified google user
```

**Important:** Remove previous “link firebase_uid when null” branch entirely.

- [ ] **Step 4: Run auth.service tests — PASS**
- [ ] **Step 5: Commit** `feat(auth): email verification and no silent Google link in AuthService`

---

### Task 6: Routes, schemas, OpenAPI, wire-up

**Files:**
- Modify: `service/src/types/schemas.ts`
- Modify: `service/src/routes/auth.routes.ts`
- Modify: `service/src/openapi/spec.ts`
- Modify: `service/tests/routes/auth.routes.test.ts` (if integration-style)

- [ ] **Step 1: Zod schemas**

```ts
export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});
```

- [ ] **Step 2: Routes**

```ts
function createAuthService(c: Context<AppEnv>) {
  const db = createDb(c.env.DB);
  return new AuthService(
    new D1UserRepository(db),
    new D1RefreshTokenRepository(db),
    new D1EmailVerificationChallengeRepository(db),
    createEmailSender(c.env),
    c.env.JWT_SECRET,
  );
}

authRoutes.post('/register', ..., async (c) => {
  const pending = await createAuthService(c).register(body);
  return created(c, pending); // 201
});

authRoutes.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
  const session = await createAuthService(c).verifyEmail(body.email, body.code);
  return success(c, session);
});

authRoutes.post('/resend-verification', zValidator('json', resendVerificationSchema), async (c) => {
  const result = await createAuthService(c).resendVerification(body.email);
  return success(c, result);
});
```

Pass `emailVerified` from Firebase decode into `loginWithGoogle`:

```ts
const decoded = await verifyFirebaseToken(...);
await service.loginWithGoogle({
  firebaseUid: decoded.sub,
  email: decoded.email,
  name: decoded.name,
  emailVerified: decoded.email_verified,
});
```

- [ ] **Step 3: OpenAPI** — document new paths + register response change + error codes.

- [ ] **Step 4: Route tests / full `npm test`**

- [ ] **Step 5: Commit** `feat(auth): verify-email and resend-verification routes`

---

### Task 7: Apps — types, API, hooks, verify screen

**Files:**
- Modify: `apps/src/features/auth/types.ts`
- Modify: `apps/src/features/auth/api/auth.api.ts`
- Modify: `apps/src/features/auth/hooks/useRegister.ts`
- Modify: `apps/src/features/auth/hooks/useEmailLogin.ts`
- Create: `apps/src/features/auth/hooks/useVerifyEmail.ts`
- Create: `apps/src/features/auth/hooks/useResendVerification.ts`
- Create: `apps/src/features/auth/auth-copy.ts`
- Create: `apps/src/app/(auth)/verify-email.tsx`
- Modify: `apps/src/app/_layout.tsx` if Stack needs new screen (file-based Expo Router usually auto)
- Modify: `apps/src/lib/api-error.ts` — optional `getApiErrorCode`

- [ ] **Step 1: Types**

```ts
export type PublicUser = {
  // ...
  emailVerified: boolean;
};

export type RegisterPendingVerification = {
  requiresEmailVerification: true;
  email: string;
};

export type VerifyEmailBody = { email: string; code: string };
export type ResendVerificationBody = { email: string };
```

- [ ] **Step 2: authApi**

```ts
register: async (payload): Promise<RegisterPendingVerification> => {
  const { data } = await apiClient.post(...);
  if (!data?.success || !data.data?.requiresEmailVerification) {
    throw new Error('Invalid register response');
  }
  return data.data;
},

verifyEmail: async (payload: VerifyEmailBody): Promise<AuthSession> => {
  const { data } = await apiClient.post<AuthSessionResponse>('/auth/verify-email', payload);
  return unwrapSession(data);
},

resendVerification: async (payload: ResendVerificationBody): Promise<void> => {
  await apiClient.post('/auth/resend-verification', payload);
},
```

- [ ] **Step 3: useRegister**

```ts
onSuccess: (pending) => {
  router.replace({
    pathname: '/(auth)/verify-email',
    params: { email: pending.email },
  });
},
// do NOT commitSession
```

- [ ] **Step 4: useEmailLogin**

On error, if axios response `error.code === 'EMAIL_NOT_VERIFIED'`, navigate to verify-email with email from form (pass email into onError via mutation variables).

- [ ] **Step 5: useVerifyEmail / useResendVerification**

Mirror useRegister: verify → commitSession → home; resend → Alert sukses / rate limit message from `auth-copy.ts`.

- [ ] **Step 6: verify-email screen**

- Read `email` from `useLocalSearchParams`
- 6-digit input (TextField)
- Submit → useVerifyEmail
- Resend button with 60s local cooldown
- Copy from `auth-copy.ts` (ID)

- [ ] **Step 7: Google hook** — map 409 codes to clear Alert via auth-copy

- [ ] **Step 8: Manual smoke** (dev): register → check wrangler log for OTP → verify → home; login unverified path; Google conflict message

- [ ] **Step 9: Commit** `feat(apps): email verification UI and API client`

---

### Task 8: Docs, ADR, seed, prod notes

**Files:**
- Modify: `service/docs/auth.md`
- Modify: `apps/docs/auth-flow.md`
- Create: `service/docs/adr/0005-email-verification-hard-gate.md`
- Create: `service/docs/adr/0006-no-silent-google-link.md`
- Modify: `service/src/db/seed.ts` if seed users need `emailVerifiedAt` for local admin login
- Modify: design spec status → Implemented (when done)

- [ ] **Step 1: ADR 0005** — hard gate + OTP challenges + Resend  
- [ ] **Step 2: ADR 0006** — no silent Google link (supersedes prior linking behavior in auth design)  
- [ ] **Step 3: Update auth.md + auth-flow.md** (register response, verify flow, Google table, ERD)  
- [ ] **Step 4: Seed** — set `emailVerifiedAt: now` for seed admin **or** document that seed admin must verify via log OTP (prefer set verified for seed only, call out exception to migration B for seed script)  
- [ ] **Step 5: README / ops** — `EMAIL_PROVIDER=resend`, secrets, `db:migrate:email:prod`  
- [ ] **Step 6: Commit** `docs(auth): email verification how-to and ADRs`

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `email_verified_at` + challenges table | 1–2 |
| OTP 6 digit hash | 2 |
| EmailSender log/Resend | 3 |
| Register no tokens | 5–6 |
| verify-email → session | 5–6 |
| resend + rate limit | 5–6 |
| Login hard gate 403 | 5 |
| Google no silent link + email_verified claim | 5–6 |
| Migration B no backfill | 1 |
| Error codes | 4 |
| FE full polish | 7 |
| Docs/glossary/ADR | 8 (CONTEXT already has terms) |
| Tests matrix | 2, 5, 6 |

---

## Self-review notes

- No TBD steps; seed verified exception documented explicitly.  
- `AppErrorCode` extended so FE reads `error.code` consistently with existing envelope.  
- In-memory resend throttle is per Worker isolate — acceptable phase 1; route middleware rate limit still applies.  
- Type names: `RegisterPendingVerification`, `emailVerified` boolean on PublicUser — consistent across service and apps.

---

## Execution handoff

Plan saved to:

**`service/docs/superpowers/plans/2026-07-18-email-verification-plan.md`**

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement tasks in this session with checkpoints  

Which approach?
