import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../../lib/jwt';
import type { TokenService, UserRole } from '../application/ports';

export class JwtTokenService implements TokenService {
  readonly accessTtlSeconds = ACCESS_TOKEN_TTL_SECONDS;
  readonly refreshTtlSeconds = REFRESH_TOKEN_TTL_SECONDS;

  constructor(private secret: string) {}

  signAccess(claims: { sub: string; role: UserRole; email: string }): Promise<string> {
    return signAccessToken(claims, this.secret);
  }

  signRefresh(claims: { sub: string; jti: string }): Promise<string> {
    return signRefreshToken(claims, this.secret);
  }

  verifyAccess(token: string) {
    return verifyAccessToken(token, this.secret);
  }

  verifyRefresh(token: string) {
    return verifyRefreshToken(token, this.secret);
  }

  hashToken(token: string): Promise<string> {
    return hashToken(token);
  }
}
