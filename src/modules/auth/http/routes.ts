import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { verifyFirebaseToken } from '../../../lib/firebase';
import { requireAuth } from '../../../platform/auth/require-auth';
import { created, success } from '../../../platform/http/envelope';
import type { AppEnv } from '../../../types';
import {
  googleLoginSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from './schemas';

export function createAuthRoutes() {
  const r = new Hono<AppEnv>();

  r.post('/register', zValidator('json', registerSchema), async (c) => {
    const { auth } = c.get('container');
    const pending = await auth.register(c.req.valid('json'));
    return created(c, pending);
  });

  r.post('/verify-email', zValidator('json', verifyEmailSchema), async (c) => {
    const { auth } = c.get('container');
    const body = c.req.valid('json');
    const session = await auth.verifyEmail(body.email, body.code);
    return success(c, session);
  });

  r.post('/resend-verification', zValidator('json', resendVerificationSchema), async (c) => {
    const { auth } = c.get('container');
    const result = await auth.resendVerification(c.req.valid('json').email);
    return success(c, result);
  });

  r.post('/login', zValidator('json', loginSchema), async (c) => {
    const { auth } = c.get('container');
    const session = await auth.login(c.req.valid('json'));
    return success(c, session);
  });

  r.post('/google', zValidator('json', googleLoginSchema), async (c) => {
    const { auth } = c.get('container');
    const { idToken } = c.req.valid('json');
    const decoded = await verifyFirebaseToken(idToken, c.env.FIREBASE_PROJECT_ID);
    const session = await auth.loginWithGoogle({
      firebaseUid: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      emailVerified: decoded.email_verified,
    });
    return success(c, session);
  });

  r.post('/refresh', zValidator('json', refreshSchema), async (c) => {
    const { auth } = c.get('container');
    const session = await auth.refresh(c.req.valid('json').refreshToken);
    return success(c, session);
  });

  r.post('/logout', zValidator('json', logoutSchema), async (c) => {
    const { auth } = c.get('container');
    await auth.logout(c.req.valid('json').refreshToken);
    return success(c, { ok: true });
  });

  r.get('/me', requireAuth, async (c) => {
    return success(c, c.get('user'));
  });

  r.patch('/me', requireAuth, zValidator('json', updateProfileSchema), async (c) => {
    const { auth } = c.get('container');
    const user = c.get('user');
    const updated = await auth.updateProfile(user.id, c.req.valid('json'));
    return success(c, updated);
  });

  return r;
}
