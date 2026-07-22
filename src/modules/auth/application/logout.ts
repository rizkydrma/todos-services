import type { AuthDeps } from './deps';

export function logout(deps: AuthDeps) {
  return async (refreshToken: string): Promise<void> => {
    try {
      const payload = await deps.tokens.verifyRefresh(refreshToken);
      await deps.refreshTokenRepo.revokeByJti(payload.jti);
    } catch {
      // idempotent
    }
  };
}
