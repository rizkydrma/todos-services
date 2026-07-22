import type { InferSelectModel } from 'drizzle-orm';
import type { AppContainer } from '../app/container';
import type { users, todos, categories, tags } from '../db/schema';
import { publicObjectUrl } from '../lib/r2';

// ── Drizzle inferred types ──
export type User = InferSelectModel<typeof users>;
export type Todo = InferSelectModel<typeof todos>;
export type Category = InferSelectModel<typeof categories>;
export type Tag = InferSelectModel<typeof tags>;

/** Safe user for API responses and request context (no password hash). */
export type PublicUser = {
  id: string;
  firebaseUid: string | null;
  email: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  /** Resolved public URL from avatar_key; null if no avatar. */
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: User, r2PublicUrl?: string): PublicUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerifiedAt != null,
    avatarUrl: r2PublicUrl ? publicObjectUrl({ R2_PUBLIC_URL: r2PublicUrl }, user.avatarKey) : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type RegisterPendingVerification = {
  requiresEmailVerification: true;
  email: string;
};

// ── Extended types (with relations) ──
export type TodoWithRelations = Todo & {
  category: Category | null;
  tags: Tag[];
};

// ── Hono app env (single source of truth for routes + middleware) ──
export type AppEnv = {
  Bindings: {
    DB: D1Database;
    FIREBASE_PROJECT_ID: string;
    JWT_SECRET: string;
    EMAIL_PROVIDER?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    /** R2 S3 API (presign + multipart + HEAD/DELETE) — see docs/r2-upload-mechanism.md */
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET_NAME?: string;
    R2_PUBLIC_URL?: string;
  };
  Variables: {
    requestId: string;
    /** Set by authMiddleware — never includes passwordHash */
    user: PublicUser;
    /** Composition root — set per request in create-app */
    container: AppContainer;
  };
};

// ── Auth (Firebase / Google idToken decoded) ──
export type DecodedToken = {
  iss: string;
  aud: string;
  auth_time: number;
  user_id: string;
  sub: string;
  iat: number;
  exp: number;
  email: string;
  email_verified: boolean;
  firebase: {
    identities: { email: string[] };
    sign_in_provider: string;
  };
  name?: string;
  picture?: string;
};

export type AuthSession = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

// ── Pagination ──
export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ── Response ──
export type SuccessResponse<T> = {
  success: true;
  data: T;
  meta?: PaginatedResult<T>['meta'];
  requestId: string;
};

export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
