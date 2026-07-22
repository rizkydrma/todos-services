import { AppError } from '../../../platform/errors/app-error';
import type { AuthSession } from '../../../types';
import type { AuthDeps } from './deps';
import { issueSession } from './issue-session';

export function refreshSession(deps: AuthDeps) {
  return async (refreshToken: string): Promise<AuthSession> => {
    const payload = await deps.tokens.verifyRefresh(refreshToken);
    const record = await deps.refreshTokenRepo.findByJti(payload.jti);

    if (!record || record.revokedAt) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    if (new Date(record.expiresAt).getTime() < deps.clock.now().getTime()) {
      throw AppError.unauthorized('Refresh token expired');
    }

    const tokenHash = await deps.tokens.hashToken(refreshToken);
    if (tokenHash !== record.tokenHash) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    if (record.userId !== payload.sub) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    const user = await deps.userRepo.findById(payload.sub);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    await deps.refreshTokenRepo.revokeByJti(payload.jti);
    return issueSession(deps, user);
  };
}
