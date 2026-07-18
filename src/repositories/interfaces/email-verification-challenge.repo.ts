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
