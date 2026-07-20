import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  refreshSchema,
  logoutSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateProfileSchema,
} from '../types/schemas';
import { verifyFirebaseToken } from '../lib/firebase';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { D1RefreshTokenRepository } from '../repositories/d1/refresh-token.repo';
import { D1EmailVerificationChallengeRepository } from '../repositories/d1/email-verification-challenge.repo';
import { createEmailSender } from '../lib/email/sender';
import { AuthService } from '../services/auth.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import type { AppEnv } from '../types';
import type { R2Env } from '../lib/r2';

const authRoutes = new Hono<AppEnv>();

function r2FromEnv(env: AppEnv['Bindings']): R2Env | undefined {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME ||
    !env.R2_PUBLIC_URL
  ) {
    return undefined;
  }
  return {
    R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: env.R2_PUBLIC_URL,
  };
}

function createAuthService(c: Context<AppEnv>) {
  const db = createDb(c.env.DB);
  return new AuthService(
    new D1UserRepository(db),
    new D1RefreshTokenRepository(db),
    new D1EmailVerificationChallengeRepository(db),
    createEmailSender(c.env),
    c.env.JWT_SECRET,
    new Map(),
    r2FromEnv(c.env),
  );
}

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');
  const pending = await createAuthService(c).register(body);
  return created(c, pending);
});

authRoutes.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
  const body = c.req.valid('json');
  const session = await createAuthService(c).verifyEmail(body.email, body.code);
  return success(c, session);
});

authRoutes.post('/resend-verification', zValidator('json', resendVerificationSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await createAuthService(c).resendVerification(body.email);
  return success(c, result);
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json');
  const session = await createAuthService(c).login(body);
  return success(c, session);
});

authRoutes.post('/google', zValidator('json', googleLoginSchema), async (c) => {
  const { idToken } = c.req.valid('json');
  const decoded = await verifyFirebaseToken(idToken, c.env.FIREBASE_PROJECT_ID);
  const session = await createAuthService(c).loginWithGoogle({
    firebaseUid: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    emailVerified: decoded.email_verified,
  });
  return success(c, session);
});

authRoutes.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  const session = await createAuthService(c).refresh(refreshToken);
  return success(c, session);
});

authRoutes.post('/logout', zValidator('json', logoutSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  await createAuthService(c).logout(refreshToken);
  return success(c, { ok: true });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  // user already loaded + stripped by authMiddleware
  return success(c, c.get('user'));
});

authRoutes.patch('/me', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const updated = await createAuthService(c).updateProfile(user.id, body);
  return success(c, updated);
});

export { authRoutes };
