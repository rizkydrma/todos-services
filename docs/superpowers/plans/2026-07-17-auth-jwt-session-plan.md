> **HISTORICAL** — design/plan trail. Path & layout di dokumen ini bisa usang. Kode sekarang: `docs/architecture.md`.

# Auth JWT Session + Password in D1 — Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes for tracking.

**Goal:** Email/password (hash in D1) + Google idToken login; both issue access/refresh JWT.

**Architecture:** Password PBKDF2 in D1; Google via existing Firebase JWKS; session HS256 JWT; refresh_tokens table.

**Tech Stack:** Hono, Drizzle/D1, jose, Web Crypto, Vitest

---

### Task 1: Schema + migration
### Task 2: password.ts + jwt.ts
### Task 3: Refresh token repo + user repo updates
### Task 4: AuthService + routes + middleware
### Task 5: Types, env, OpenAPI, seed
### Task 6: Tests green
