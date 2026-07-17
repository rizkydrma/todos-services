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
