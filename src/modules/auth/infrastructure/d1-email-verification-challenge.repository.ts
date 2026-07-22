import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { emailVerificationChallenges } from '../../../db/schema';
import type { DbClient } from '../../../db';
import type {
  CreateChallengeInput,
  EmailVerificationChallenge,
  IEmailVerificationChallengeRepository,
} from '../application/ports';

export class D1EmailVerificationChallengeRepository implements IEmailVerificationChallengeRepository {
  constructor(private db: DbClient) {}

  async create(data: CreateChallengeInput): Promise<EmailVerificationChallenge> {
    const now = new Date().toISOString();
    const result = await this.db
      .insert(emailVerificationChallenges)
      .values({
        ...data,
        attemptCount: 0,
        createdAt: now,
        consumedAt: null,
      })
      .returning();
    return result[0];
  }

  async findActiveByUserId(userId: string): Promise<EmailVerificationChallenge | null> {
    const result = await this.db
      .select()
      .from(emailVerificationChallenges)
      .where(and(eq(emailVerificationChallenges.userId, userId), isNull(emailVerificationChallenges.consumedAt)))
      .orderBy(desc(emailVerificationChallenges.createdAt))
      .limit(1);
    return result[0] ?? null;
  }

  async consumeAllActiveForUser(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(emailVerificationChallenges)
      .set({ consumedAt: now })
      .where(and(eq(emailVerificationChallenges.userId, userId), isNull(emailVerificationChallenges.consumedAt)));
  }

  async incrementAttempts(id: string): Promise<EmailVerificationChallenge> {
    const result = await this.db
      .update(emailVerificationChallenges)
      .set({ attemptCount: sql`${emailVerificationChallenges.attemptCount} + 1` })
      .where(eq(emailVerificationChallenges.id, id))
      .returning();
    return result[0];
  }

  async consume(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(emailVerificationChallenges)
      .set({ consumedAt: now })
      .where(eq(emailVerificationChallenges.id, id));
  }
}
