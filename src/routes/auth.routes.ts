import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { registerSchema, loginSchema, googleLoginSchema, refreshSchema, logoutSchema } from '../types/schemas';
import { verifyFirebaseToken } from '../lib/firebase';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { D1RefreshTokenRepository } from '../repositories/d1/refresh-token.repo';
import { AuthService } from '../services/auth.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import type { AppEnv } from '../types';

const authRoutes = new Hono<AppEnv>();

function createAuthService(c: Context<AppEnv>) {
  const db = createDb(c.env.DB);
  return new AuthService(new D1UserRepository(db), new D1RefreshTokenRepository(db), c.env.JWT_SECRET);
}

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');
  const session = await createAuthService(c).register(body);
  return created(c, session);
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

export { authRoutes };
