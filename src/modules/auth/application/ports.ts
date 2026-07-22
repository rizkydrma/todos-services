import type { PaginatedResult, PaginationParams, User } from '../../../types';

export type { User };

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByFirebaseUid(firebaseUid: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}

export type CreateUserInput = {
  id: string;
  firebaseUid?: string | null;
  email: string;
  name: string;
  role: 'user' | 'admin';
  passwordHash?: string | null;
  emailVerifiedAt?: string | null;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  firebaseUid?: string | null;
  passwordHash?: string | null;
  emailVerifiedAt?: string | null;
  avatarKey?: string | null;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  jti: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export type CreateRefreshTokenInput = {
  id: string;
  userId: string;
  jti: string;
  tokenHash: string;
  expiresAt: string;
};

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  findByJti(jti: string): Promise<RefreshTokenRecord | null>;
  revokeByJti(jti: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

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
  findActiveByUserId(userId: string): Promise<EmailVerificationChallenge | null>;
  consumeAllActiveForUser(userId: string): Promise<void>;
  incrementAttempts(id: string): Promise<EmailVerificationChallenge>;
  consume(id: string): Promise<void>;
}

export type SendOtpInput = {
  to: string;
  code: string;
  expiresInMinutes: number;
};

export interface EmailSender {
  sendEmailVerificationOtp(input: SendOtpInput): Promise<void>;
}

export interface IdGenerator {
  next(): string;
}

export interface Clock {
  now(): Date;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface OtpService {
  generate(): string;
  hash(code: string): Promise<string>;
  verify(code: string, codeHash: string): Promise<boolean>;
  ttlMs: number;
  maxAttempts: number;
}

export type UserRole = 'user' | 'admin';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: 'refresh';
};

export interface TokenService {
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  signAccess(claims: { sub: string; role: UserRole; email: string }): Promise<string>;
  signRefresh(claims: { sub: string; jti: string }): Promise<string>;
  verifyAccess(token: string): Promise<AccessTokenPayload>;
  verifyRefresh(token: string): Promise<RefreshTokenPayload>;
  hashToken(token: string): Promise<string>;
}

/** Optional R2 for avatar public URL + best-effort delete */
export interface AvatarObjectStore {
  publicUrlBase?: string;
  deleteObject?(key: string): Promise<void>;
}
