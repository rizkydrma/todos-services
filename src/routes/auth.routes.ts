import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { registerSchema, loginSchema } from '../types/schemas';
import { verifyFirebaseToken } from '../lib/firebase';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { AuthService } from '../services/auth.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';

const authRoutes = new Hono<{ Bindings: { DB: D1Database; FIREBASE_PROJECT_ID: string } }>();

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { token } = c.req.valid('json');
  const decoded = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);

  const db = createDb(c.env.DB);
  const service = new AuthService(new D1UserRepository(db));

  const user = await service.register({
    firebaseUid: decoded.sub,
    email: decoded.email,
    name: decoded.name || decoded.email.split('@')[0],
  });

  return created(c, user);
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { token } = c.req.valid('json');
  const decoded = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);

  const db = createDb(c.env.DB);
  const service = new AuthService(new D1UserRepository(db));

  const user = await service.login(decoded.sub);
  return success(c, user);
});

authRoutes.get('/me', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new AuthService(new D1UserRepository(db));

  const authUser = c.get('user');
  const tokenPayload = c.get('tokenPayload');

  const user = await service.getProfile(authUser.id, {
    email: tokenPayload.email,
    name: tokenPayload.name || '',
  });

  return success(c, user);
});

export { authRoutes };
