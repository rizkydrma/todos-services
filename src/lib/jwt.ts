import { SignJWT, jwtVerify } from 'jose';
import { AppError } from './errors';
import { bytesToBase64 } from './encoding';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

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

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'user' || value === 'admin';
}

export async function signAccessToken(
  claims: { sub: string; role: UserRole; email: string },
  secret: string,
): Promise<string> {
  return new SignJWT({ role: claims.role, email: claims.email, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey(secret));
}

export async function signRefreshToken(claims: { sub: string; jti: string }, secret: string): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey(secret));
}

export async function verifyAccessToken(token: string, secret: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if (payload.type !== 'access' || typeof payload.sub !== 'string' || !isUserRole(payload.role)) {
      throw AppError.unauthorized('Invalid token');
    }
    return {
      sub: payload.sub,
      role: payload.role,
      email: typeof payload.email === 'string' ? payload.email : '',
      type: 'access',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired token');
  }
}

export async function verifyRefreshToken(token: string, secret: string): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
      throw AppError.unauthorized('Invalid refresh token');
    }
    return {
      sub: payload.sub,
      jti: payload.jti,
      type: 'refresh',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(digest);
}
