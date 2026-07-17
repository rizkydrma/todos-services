import type { InferSelectModel } from 'drizzle-orm';
import type { users, todos, categories, tags } from '../db/schema';

// ── Drizzle inferred types ──
export type User = InferSelectModel<typeof users>;
export type Todo = InferSelectModel<typeof todos>;
export type Category = InferSelectModel<typeof categories>;
export type Tag = InferSelectModel<typeof tags>;

// ── Extended types (with relations) ──
export type TodoWithRelations = Todo & {
  category: Category | null;
  tags: Tag[];
};

// ── Hono app env ──
export type AppEnv = {
  Bindings: {
    DB: D1Database;
    FIREBASE_PROJECT_ID: string;
  };
  Variables: {
    requestId: string;
  };
};

// ── Auth ──
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
