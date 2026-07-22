import type { AuthSession, User } from '../../../types';
import type { AuthDeps } from './deps';
import { toPublic } from './to-public';

export async function issueSession(deps: AuthDeps, user: User): Promise<AuthSession> {
  const jti = deps.ids.next();
  const accessToken = await deps.tokens.signAccess({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = await deps.tokens.signRefresh({ sub: user.id, jti });
  const tokenHash = await deps.tokens.hashToken(refreshToken);
  const expiresAt = new Date(deps.clock.now().getTime() + deps.tokens.refreshTtlSeconds * 1000).toISOString();

  await deps.refreshTokenRepo.create({
    id: deps.ids.next(),
    userId: user.id,
    jti,
    tokenHash,
    expiresAt,
  });

  return {
    user: toPublic(deps, user),
    accessToken,
    refreshToken,
    expiresIn: deps.tokens.accessTtlSeconds,
  };
}
