import { AppError } from '../../../platform/errors/app-error';
import type { AuthSession } from '../../../types';
import type { AuthDeps } from './deps';
import { issueSession } from './issue-session';

export function verifyEmail(deps: AuthDeps) {
  return async (email: string, code: string): Promise<AuthSession> => {
    const normalized = email.trim().toLowerCase();
    const user = await deps.userRepo.findByEmail(normalized);
    if (!user) {
      throw AppError.invalidOtp('Invalid or expired code');
    }

    if (user.emailVerifiedAt) {
      return issueSession(deps, user);
    }

    const ch = await deps.challengeRepo.findActiveByUserId(user.id);
    if (!ch) {
      throw AppError.otpExpired('Code expired');
    }
    if (new Date(ch.expiresAt).getTime() < deps.clock.now().getTime()) {
      throw AppError.otpExpired('Code expired');
    }
    if (ch.attemptCount >= deps.otp.maxAttempts) {
      throw AppError.otpMaxAttempts('Too many attempts');
    }

    const ok = await deps.otp.verify(code, ch.codeHash);
    if (!ok) {
      await deps.challengeRepo.incrementAttempts(ch.id);
      throw AppError.invalidOtp('Invalid or expired code');
    }

    await deps.challengeRepo.consume(ch.id);
    const verified = await deps.userRepo.update(user.id, {
      emailVerifiedAt: deps.clock.now().toISOString(),
    });
    return issueSession(deps, verified);
  };
}
