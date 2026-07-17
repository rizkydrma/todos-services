import { and, eq, isNull } from 'drizzle-orm';
import { refreshTokens } from '../../db/schema';
import type { DbClient } from '../../db';
import type {
  CreateRefreshTokenInput,
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from '../interfaces/refresh-token.repo';

export class D1RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private db: DbClient) {}

  async create(data: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const now = new Date().toISOString();
    const result = await this.db
      .insert(refreshTokens)
      .values({
        ...data,
        revokedAt: null,
        createdAt: now,
      })
      .returning();
    return result[0];
  }

  async findByJti(jti: string): Promise<RefreshTokenRecord | null> {
    const result = await this.db.select().from(refreshTokens).where(eq(refreshTokens.jti, jti)).limit(1);
    return result[0] ?? null;
  }

  async revokeByJti(jti: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.jti, jti), isNull(refreshTokens.revokedAt)));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}
